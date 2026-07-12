import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@ngneat/transloco';
import type { TransactionDirection } from '@spendist/data-access/supabase-types';
import {
  CategorySelectComponent,
  CategorySelectOption,
} from '../../shared/category-select/category-select.component';
import { logError } from '../../core/logger';
import { parseAmountInput } from './transaction-amount.parser';
import {
  CreateTransactionBatchItem,
  TransactionsStore,
  WalletEntity,
} from './transactions.store';

interface BulkTransactionDraftRow {
  readonly id: number;
  readonly occurredOn: string;
  readonly description: string;
  readonly amount: string;
  readonly currency: string;
  readonly direction: TransactionDirection;
  readonly categoryId: string;
  readonly walletId: string;
  readonly tags: string;
  readonly placeId: string;
  readonly touched: boolean;
}

interface BulkTransactionIssue {
  readonly rowId: number;
  readonly rowNumber: number;
  readonly key: string;
}

interface PreparedBulkTransaction {
  readonly row: BulkTransactionDraftRow;
  readonly amount: number;
  readonly occurredAt: Date;
  readonly currency: string;
  readonly wallet: WalletEntity;
}

type BulkTransactionField = keyof Omit<BulkTransactionDraftRow, 'id'>;

@Component({
  standalone: true,
  selector: 'app-transaction-bulk-create-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoPipe, CategorySelectComponent],
  templateUrl: './transaction-bulk-create-form.component.html',
})
export class TransactionBulkCreateFormComponent {
  private static readonly INITIAL_ROW_COUNT = 8;
  private static readonly EXTRA_ROW_COUNT = 10;
  private nextRowId = 0;

  protected readonly store = inject(TransactionsStore);
  protected readonly rows = signal<readonly BulkTransactionDraftRow[]>(
    this.createRows(TransactionBulkCreateFormComponent.INITIAL_ROW_COUNT)
  );
  protected readonly submitted = signal(false);
  protected readonly asyncIssues = signal<readonly BulkTransactionIssue[]>([]);
  protected readonly focusedRowIndex = signal(0);

  readonly closed = output<void>();
  readonly saved = output<number>();

  protected readonly categoryView = computed(() => this.buildCategoryView());
  protected readonly currencyOptions = computed(() => {
    const currencies = this.store.currencies();
    return currencies.length > 0
      ? currencies
      : [{ id: -1, symbol: this.defaultCurrency() }];
  });
  protected readonly activeRows = computed(() =>
    this.rows().filter((row) => this.rowHasInput(row))
  );
  protected readonly validationIssues = computed(() => [
    ...this.validateRows(),
    ...this.asyncIssues(),
  ]);
  protected readonly duplicateWarningCount = computed(() =>
    this.countDuplicateRows()
  );
  protected readonly canSubmit = computed(
    () =>
      this.activeRows().length > 0 &&
      this.validationIssues().length === 0 &&
      !this.store.transactionMutationPending()
  );

  protected onClose(): void {
    this.closed.emit();
  }

  protected addRows(count = TransactionBulkCreateFormComponent.EXTRA_ROW_COUNT): void {
    this.rows.update((rows) => [...rows, ...this.createRows(count)]);
  }

  protected updateRow(
    rowId: number,
    field: BulkTransactionField,
    value: string | TransactionDirection | boolean
  ): void {
    this.asyncIssues.set([]);
    this.rows.update((rows) =>
      rows.map((row) =>
        row.id === rowId ? { ...row, [field]: value, touched: true } : row
      )
    );
  }

  protected clearRow(rowId: number): void {
    this.asyncIssues.set([]);
    this.rows.update((rows) =>
      rows.map((row) =>
        row.id === rowId ? this.createRow(row.id) : row
      )
    );
  }

  protected onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (!text.trim()) {
      return;
    }

    const parsedRows = this.parsePastedRows(text);
    if (parsedRows.length === 0) {
      return;
    }

    event.preventDefault();
    this.asyncIssues.set([]);
    const startIndex = this.focusedRowIndex();
    this.rows.update((rows) => {
      const next = [...rows];
      while (next.length < startIndex + parsedRows.length) {
        next.push(this.createRow(this.nextRowId++));
      }

      parsedRows.forEach((row, offset) => {
        const existing =
          next[startIndex + offset] ?? this.createRow(this.nextRowId++);
        next[startIndex + offset] = {
          ...existing,
          ...row,
          touched: true,
        };
      });

      return next;
    });
  }

  protected setFocusedRow(index: number): void {
    this.focusedRowIndex.set(index);
  }

  protected trackRow(_index: number, row: BulkTransactionDraftRow): number {
    return row.id;
  }

  protected rowIssue(row: BulkTransactionDraftRow): BulkTransactionIssue | null {
    return (
      this.validationIssues().find((issue) => issue.rowId === row.id) ?? null
    );
  }

  protected async submit(): Promise<void> {
    if (this.store.transactionMutationPending()) {
      return;
    }

    this.submitted.set(true);
    this.asyncIssues.set([]);
    const prepared = this.prepareRows();
    if (!prepared || prepared.length === 0) {
      return;
    }

    const tagNames = Array.from(
      new Set(
        prepared.flatMap((item) => this.parseTagNames(item.row.tags))
      )
    );

    try {
      if (tagNames.length > 0) {
        await this.store.ensureTags(tagNames);
      }

      const payload: CreateTransactionBatchItem[] = [];
      const exchangeIssues: BulkTransactionIssue[] = [];
      for (const item of prepared) {
        const targetCurrency = item.wallet.currency.toUpperCase();
        const amountInDefault =
          item.currency === targetCurrency
            ? item.amount
            : await this.calculateAmountInDefault(
                item.amount,
                item.currency,
                targetCurrency,
                item.occurredAt
              );

        if (amountInDefault === null) {
          exchangeIssues.push(this.issueForRow(item.row, 'exchangeRate'));
          continue;
        }

        payload.push({
          description: item.row.description.trim() || null,
          categoryId: item.row.categoryId,
          occurredAt: item.occurredAt,
          amount: item.amount,
          currency: item.currency,
          direction: item.row.direction,
          tagIds: this.resolveTagIds(item.row.tags),
          foreignAmount: amountInDefault,
          foreignCurrency: targetCurrency,
          walletId: item.wallet.id,
          placeId: item.row.placeId || null,
        });
      }

      if (exchangeIssues.length > 0) {
        this.asyncIssues.set(exchangeIssues);
        return;
      }

      const result = await this.store.createTransactionBatch({
        transactions: payload,
      });
      if (result.success) {
        this.saved.emit(result.created);
        this.closed.emit();
      }
    } catch (error) {
      logError('TransactionBulkCreateForm', 'Failed to create batch', error);
      this.asyncIssues.set(
        prepared.map((item) => this.issueForRow(item.row, 'save'))
      );
    }
  }

  private prepareRows(): readonly PreparedBulkTransaction[] | null {
    const issues = this.validateRows();
    if (issues.length > 0) {
      return null;
    }

    return this.activeRows()
      .map((row): PreparedBulkTransaction | null => {
        const amount = parseAmountInput(row.amount);
        const occurredAt = this.parseDate(row.occurredOn);
        const wallet = this.store.wallets().find((item) => item.id === row.walletId);
        const currency = row.currency.trim().toUpperCase();
        if (!amount || !occurredAt || !wallet || !/^[A-Z]{3}$/.test(currency)) {
          return null;
        }

        return {
          row,
          amount,
          occurredAt,
          currency,
          wallet,
        };
      })
      .filter((item): item is PreparedBulkTransaction => Boolean(item));
  }

  private validateRows(): readonly BulkTransactionIssue[] {
    const issues: BulkTransactionIssue[] = [];
    const rows = this.rows();

    rows.forEach((row, index) => {
      if (!this.rowHasInput(row)) {
        return;
      }

      if (!this.parseDate(row.occurredOn)) {
        issues.push(this.issueForRow(row, 'date', index));
      }

      if (parseAmountInput(row.amount) === null) {
        issues.push(this.issueForRow(row, 'amount', index));
      }

      if (!row.categoryId) {
        issues.push(this.issueForRow(row, 'category', index));
      }

      if (!this.store.wallets().some((wallet) => wallet.id === row.walletId)) {
        issues.push(this.issueForRow(row, 'wallet', index));
      }

      if (!/^[A-Z]{3}$/.test(row.currency.trim().toUpperCase())) {
        issues.push(this.issueForRow(row, 'currency', index));
      }
    });

    return issues;
  }

  private issueForRow(
    row: BulkTransactionDraftRow,
    key: string,
    index = this.rows().findIndex((item) => item.id === row.id)
  ): BulkTransactionIssue {
    return {
      rowId: row.id,
      rowNumber: index + 1,
      key,
    };
  }

  private rowHasInput(row: BulkTransactionDraftRow): boolean {
    return (
      row.touched &&
      [
        row.description,
        row.amount,
        row.tags,
        row.placeId,
        row.categoryId,
        row.walletId,
        row.currency,
      ].some((value) => value.trim().length > 0)
    );
  }

  private countDuplicateRows(): number {
    const seen = new Set<string>();
    let duplicates = 0;
    for (const row of this.activeRows()) {
      const amount = parseAmountInput(row.amount);
      if (amount === null) {
        continue;
      }

      const signature = [
        row.occurredOn,
        row.description.trim().toLowerCase(),
        amount.toFixed(2),
        row.currency.trim().toUpperCase(),
        row.direction,
        row.categoryId,
        row.walletId,
      ].join('|');
      if (seen.has(signature)) {
        duplicates += 1;
      } else {
        seen.add(signature);
      }
    }

    return duplicates;
  }

  private parsePastedRows(
    text: string
  ): readonly Partial<BulkTransactionDraftRow>[] {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => this.parsePastedLine(line));
  }

  private parsePastedLine(line: string): Partial<BulkTransactionDraftRow> {
    const cells = line.includes('\t')
      ? line.split('\t')
      : line.split(/[;,]/);
    const [
      occurredOn,
      description,
      amount,
      currency,
      direction,
      category,
      wallet,
      tags,
      place,
    ] = cells.map((cell) => cell.trim());

    const walletMatch = this.resolveWallet(wallet);
    return {
      occurredOn: this.normalizeDateInput(occurredOn) || this.todayIsoString(),
      description: description ?? '',
      amount: amount ?? '',
      currency:
        this.normalizeCurrency(currency) ||
        walletMatch?.currency ||
        this.defaultCurrency(),
      direction: this.resolveDirection(direction),
      categoryId: this.resolveCategory(category) || this.defaultCategoryId(),
      walletId: walletMatch?.id ?? this.defaultWalletId(),
      tags: tags ?? '',
      placeId: this.resolvePlace(place) ?? '',
    };
  }

  private resolveDirection(value: string | undefined): TransactionDirection {
    const normalized = (value ?? '').trim().toLowerCase();
    return ['income', 'przychód', 'przychod', '+'].includes(normalized)
      ? 'income'
      : 'expense';
  }

  private resolveCategory(value: string | undefined): string | null {
    const normalized = this.normalizeLookup(value);
    if (!normalized) {
      return null;
    }

    for (const group of this.categoryView()) {
      const match = group.options.find(
        (option) =>
          this.normalizeLookup(option.label) === normalized ||
          this.normalizeLookup(option.label.split('/').at(-1)) === normalized
      );
      if (match) {
        return match.id;
      }
    }

    return null;
  }

  private resolveWallet(value: string | undefined): WalletEntity | null {
    const normalized = this.normalizeLookup(value);
    if (!normalized) {
      return this.store.wallets().find((wallet) => wallet.id === this.defaultWalletId()) ?? null;
    }

    return (
      this.store
        .wallets()
        .find(
          (wallet) =>
            this.normalizeLookup(wallet.name) === normalized ||
            this.normalizeLookup(wallet.currency) === normalized
        ) ?? null
    );
  }

  private resolvePlace(value: string | undefined): string | null {
    const normalized = this.normalizeLookup(value);
    if (!normalized) {
      return null;
    }

    return (
      this.store
        .places()
        .find((place) => this.normalizeLookup(place.name) === normalized)?.id ??
      null
    );
  }

  private resolveTagIds(raw: string): readonly string[] {
    const names = this.parseTagNames(raw);
    const lookup = new Map(
      this.store.tags().map((tag) => [tag.name.toLowerCase(), tag])
    );
    return Array.from(
      new Set(
        names
          .map((name) => lookup.get(name.toLowerCase())?.id)
          .filter((id): id is string => Boolean(id))
      )
    );
  }

  private parseTagNames(raw: string): readonly string[] {
    return Array.from(
      new Set(
        raw
          .split(/[;,]/)
          .map((name) => this.sanitizeTagName(name))
          .filter((name): name is string => Boolean(name))
      )
    );
  }

  private sanitizeTagName(name: string | null | undefined): string | null {
    const trimmed = (name ?? '').trim();
    if (!trimmed) {
      return null;
    }

    return trimmed.length > 60 ? trimmed.slice(0, 60) : trimmed;
  }

  private async calculateAmountInDefault(
    amount: number,
    sourceCurrency: string,
    targetCurrency: string,
    occurredAt: Date
  ): Promise<number | null> {
    if (sourceCurrency === targetCurrency) {
      return amount;
    }

    try {
      const rate = await this.store.getExchangeRate(
        sourceCurrency,
        targetCurrency,
        occurredAt
      );
      return rate === null ? null : amount * rate;
    } catch (error) {
      logError('TransactionBulkCreateForm', 'Failed to load exchange rate', error);
      return null;
    }
  }

  private createRows(count: number): readonly BulkTransactionDraftRow[] {
    return Array.from({ length: count }, () =>
      this.createRow(this.nextRowId++)
    );
  }

  private createRow(id: number): BulkTransactionDraftRow {
    return {
      id,
      occurredOn: this.todayIsoString(),
      description: '',
      amount: '',
      currency: this.defaultCurrency(),
      direction: 'expense',
      categoryId: this.defaultCategoryId(),
      walletId: this.defaultWalletId(),
      tags: '',
      placeId: '',
      touched: false,
    };
  }

  private defaultCurrency(): string {
    const wallet = this.store
      .wallets()
      .find((item) => item.id === this.defaultWalletId());
    return wallet?.currency ?? this.store.defaultCurrency();
  }

  private defaultWalletId(): string {
    return this.store.defaultWalletId() ?? this.store.wallets()[0]?.id ?? '';
  }

  private defaultCategoryId(): string {
    return this.store.categories()[0]?.id ?? '';
  }

  private parseDate(value: string): Date | null {
    if (!this.normalizeDateInput(value)) {
      return null;
    }

    const [year, month, day] = value
      .split('-')
      .map((segment) => Number(segment));
    const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private normalizeDateInput(value: string | undefined): string | null {
    const raw = (value ?? '').trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    if (
      Number.isNaN(date.getTime()) ||
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return raw;
  }

  private normalizeCurrency(value: string | undefined): string | null {
    const currency = (value ?? '').trim().toUpperCase();
    return /^[A-Z]{3}$/.test(currency) ? currency : null;
  }

  private normalizeLookup(value: string | undefined): string {
    return (value ?? '').trim().toLowerCase();
  }

  private todayIsoString(): string {
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private buildCategoryView(): readonly {
    groupName: string | null;
    options: readonly CategorySelectOption[];
  }[] {
    const grouped = this.store.groupedCategories();
    const ungrouped = this.store.ungroupedCategories();
    const categoryNames = new Map(
      this.store.categories().map((category) => [category.id, category.name])
    );

    return [
      ...grouped.map((group) => ({
        groupName: group.name,
        options: group.categories.map((category) => ({
          id: category.id,
          label: this.buildCategoryLabel(
            category.id,
            category.name,
            category.parentId,
            categoryNames
          ),
          groupName: group.name,
        })),
      })),
      ...(ungrouped.length > 0
        ? [
            {
              groupName: null,
              options: ungrouped.map((category) => ({
                id: category.id,
                label: this.buildCategoryLabel(
                  category.id,
                  category.name,
                  category.parentId,
                  categoryNames
                ),
                groupName: null,
              })),
            },
          ]
        : []),
    ];
  }

  private buildCategoryLabel(
    categoryId: string,
    categoryName: string,
    parentId: string | null,
    categoryNames: ReadonlyMap<string, string>
  ): string {
    const names = [categoryName];
    let currentParentId = parentId;
    const visited = new Set<string>([categoryId]);

    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      const parentName = categoryNames.get(currentParentId);
      if (!parentName) {
        break;
      }
      names.unshift(parentName);
      const parent = this.store
        .categories()
        .find((category) => category.id === currentParentId);
      currentParentId = parent?.parentId ?? null;
    }

    return names.join(' / ');
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@ngneat/transloco';
import { NgIcon } from '@ng-icons/core';
import {
  heroArrowDown,
  heroArrowUp,
  heroEllipsisVertical,
  heroTrash,
  heroXMark,
} from '@ng-icons/heroicons/outline';
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
  readonly categoryId: string;
  readonly tags: string;
  readonly placeId: string;
  readonly quantity: number | null;
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

type BulkTransactionField = Exclude<
  keyof BulkTransactionDraftRow,
  'id' | 'touched'
>;
type CopyableBulkTransactionField = Extract<
  BulkTransactionField,
  'occurredOn' | 'currency' | 'categoryId' | 'tags' | 'placeId'
>;
type CopyDirection = 'up' | 'down';

@Component({
  standalone: true,
  selector: 'app-transaction-bulk-create-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoPipe, NgIcon, CategorySelectComponent],
  templateUrl: './transaction-bulk-create-form.component.html',
})
export class TransactionBulkCreateFormComponent {
  private static readonly INITIAL_ROW_COUNT = 8;
  private static readonly EXTRA_ROW_COUNT = 10;
  private nextRowId = 0;

  protected readonly store = inject(TransactionsStore);
  protected readonly batchWalletId = signal(this.defaultWalletId());
  protected readonly batchDirection = signal<TransactionDirection>('expense');
  protected readonly rows = signal<readonly BulkTransactionDraftRow[]>(
    this.createRows(TransactionBulkCreateFormComponent.INITIAL_ROW_COUNT)
  );
  protected readonly submitted = signal(false);
  protected readonly asyncIssues = signal<readonly BulkTransactionIssue[]>([]);
  protected readonly focusedRowIndex = signal(0);
  private readonly batchWalletSyncEffect = effect(() => {
    const wallets = this.store.wallets();
    if (wallets.length === 0) {
      return;
    }

    const currentWalletId = this.batchWalletId();
    if (wallets.some((wallet) => wallet.id === currentWalletId)) {
      return;
    }

    const walletId = this.defaultWalletId();
    const currency =
      wallets
        .find((wallet) => wallet.id === walletId)
        ?.currency.toUpperCase() ?? this.store.defaultCurrency();
    this.batchWalletId.set(walletId);
    this.rows.update((rows) =>
      rows.map((row) => (!row.touched ? { ...row, currency } : row))
    );
  });

  readonly closed = output<void>();
  readonly saved = output<number>();

  protected readonly closeIcon = heroXMark;
  protected readonly clearIcon = heroTrash;
  protected readonly copyMenuIcon = heroEllipsisVertical;
  protected readonly copyUpIcon = heroArrowUp;
  protected readonly copyDownIcon = heroArrowDown;

  protected readonly categoryView = computed(() => this.buildCategoryView());
  protected readonly currencyOptions = computed(() => {
    const currencies = this.store.currencies();
    return currencies.length > 0
      ? currencies
      : [{ id: -1, symbol: this.selectedWalletCurrency() }];
  });
  protected readonly activeRows = computed(() =>
    this.rows().filter((row) => this.rowHasInput(row))
  );
  protected readonly transactionCount = computed(() =>
    this.activeRows().reduce(
      (total, row) => total + (this.validQuantity(row.quantity) ?? 0),
      0
    )
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
      this.transactionCount() > 0 &&
      this.validationIssues().length === 0 &&
      this.selectedWallet() !== null &&
      !this.store.transactionMutationPending()
  );

  protected onClose(): void {
    this.closed.emit();
  }

  protected addRows(
    count = TransactionBulkCreateFormComponent.EXTRA_ROW_COUNT
  ): void {
    this.rows.update((rows) => [...rows, ...this.createRows(count)]);
  }

  protected updateRow(
    rowId: number,
    field: BulkTransactionField,
    value: string | number | null
  ): void {
    this.asyncIssues.set([]);
    this.rows.update((rows) =>
      rows.map((row) =>
        row.id === rowId ? { ...row, [field]: value, touched: true } : row
      )
    );
  }

  protected updateBatchWallet(walletId: string): void {
    const previousCurrency = this.selectedWallet()?.currency.toUpperCase();
    this.batchWalletId.set(walletId);
    const nextCurrency = this.selectedWallet()?.currency.toUpperCase();
    if (!nextCurrency || nextCurrency === previousCurrency) {
      return;
    }

    this.rows.update((rows) =>
      rows.map((row) =>
        !row.touched ? { ...row, currency: nextCurrency } : row
      )
    );
  }

  protected updateBatchDirection(direction: TransactionDirection): void {
    this.batchDirection.set(direction);
  }

  protected copyField(
    rowId: number,
    field: CopyableBulkTransactionField,
    direction: CopyDirection
  ): void {
    const rows = this.rows();
    const sourceIndex = rows.findIndex((row) => row.id === rowId);
    const source = rows[sourceIndex];
    if (!source || sourceIndex < 0) {
      return;
    }

    this.asyncIssues.set([]);
    this.rows.set(
      rows.map((row, index) => {
        const shouldCopy =
          direction === 'up' ? index < sourceIndex : index > sourceIndex;
        return shouldCopy ? { ...row, [field]: source[field] } : row;
      })
    );
  }

  protected copyFieldAndClose(
    rowId: number,
    field: CopyableBulkTransactionField,
    direction: CopyDirection,
    event: Event
  ): void {
    this.copyField(rowId, field, direction);
    const trigger = event.currentTarget as HTMLElement | null;
    trigger?.closest('details')?.removeAttribute('open');
  }

  protected clearRow(rowId: number): void {
    this.asyncIssues.set([]);
    this.rows.update((rows) =>
      rows.map((row) => (row.id === rowId ? this.createRow(row.id) : row))
    );
  }

  @HostListener('document:paste', ['$event'])
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

  protected rowIssue(
    row: BulkTransactionDraftRow
  ): BulkTransactionIssue | null {
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
      new Set(prepared.flatMap((item) => this.parseTagNames(item.row.tags)))
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

        const transaction: CreateTransactionBatchItem = {
          description: item.row.description.trim() || null,
          categoryId: item.row.categoryId,
          occurredAt: item.occurredAt,
          amount: item.amount,
          currency: item.currency,
          direction: this.batchDirection(),
          tagIds: this.resolveTagIds(item.row.tags),
          foreignAmount: amountInDefault,
          foreignCurrency: targetCurrency,
          walletId: item.wallet.id,
          placeId: item.row.placeId || null,
        };
        const quantity = this.validQuantity(item.row.quantity) ?? 0;
        for (let index = 0; index < quantity; index += 1) {
          payload.push({ ...transaction });
        }
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

    const wallet = this.selectedWallet();
    if (!wallet) {
      return null;
    }

    return this.activeRows()
      .map((row): PreparedBulkTransaction | null => {
        const amount = parseAmountInput(row.amount);
        const occurredAt = this.parseDate(row.occurredOn);
        const currency = row.currency.trim().toUpperCase();
        if (
          !amount ||
          !occurredAt ||
          !/^[A-Z]{3}$/.test(currency) ||
          this.validQuantity(row.quantity) === null
        ) {
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

      if (!/^[A-Z]{3}$/.test(row.currency.trim().toUpperCase())) {
        issues.push(this.issueForRow(row, 'currency', index));
      }

      if (this.validQuantity(row.quantity) === null) {
        issues.push(this.issueForRow(row, 'quantity', index));
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
        this.batchDirection(),
        row.categoryId,
        this.batchWalletId(),
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
    const cells = line.includes('\t') ? line.split('\t') : line.split(/[;,]/);
    const normalizedCells = cells.map((cell) => cell.trim());
    const legacyFormat = normalizedCells.length >= 9;
    const occurredOn = normalizedCells[0];
    const description = normalizedCells[1];
    const amount = normalizedCells[2];
    const currency = normalizedCells[3];
    const category = normalizedCells[legacyFormat ? 5 : 4];
    const tags = normalizedCells[legacyFormat ? 7 : 5];
    const place = normalizedCells[legacyFormat ? 8 : 6];
    const quantity = normalizedCells[legacyFormat ? 9 : 7];

    return {
      occurredOn: this.normalizeDateInput(occurredOn) || this.todayIsoString(),
      description: description ?? '',
      amount: amount ?? '',
      currency:
        this.normalizeCurrency(currency) || this.selectedWalletCurrency(),
      categoryId: this.resolveCategory(category) || this.defaultCategoryId(),
      tags: tags ?? '',
      placeId: this.resolvePlace(place) ?? '',
      quantity: this.parsePastedQuantity(quantity),
    };
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
      logError(
        'TransactionBulkCreateForm',
        'Failed to load exchange rate',
        error
      );
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
      currency: this.selectedWalletCurrency(),
      categoryId: this.defaultCategoryId(),
      tags: '',
      placeId: '',
      quantity: 1,
      touched: false,
    };
  }

  private selectedWallet(): WalletEntity | null {
    return (
      this.store
        .wallets()
        .find((wallet) => wallet.id === this.batchWalletId()) ?? null
    );
  }

  private selectedWalletCurrency(): string {
    const wallet = this.selectedWallet();
    return wallet?.currency ?? this.store.defaultCurrency();
  }

  private defaultWalletId(): string {
    return this.store.defaultWalletId() ?? this.store.wallets()[0]?.id ?? '';
  }

  private defaultCategoryId(): string {
    return this.store.categories()[0]?.id ?? '';
  }

  private validQuantity(value: number | null): number | null {
    return typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 100
      ? value
      : null;
  }

  private parsePastedQuantity(value: string | undefined): number {
    if (!value?.trim()) {
      return 1;
    }

    const quantity = Number(value);
    return Number.isFinite(quantity) ? quantity : 0;
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

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { heroQuestionMarkCircle, heroXMark } from '@ng-icons/heroicons/outline';
import { TranslocoPipe } from '@ngneat/transloco';
import { SPENDIST_CSV_HEADERS } from '../settings/spendist-csv-transfer.parser';
import {
  TRANSACTION_IMPORT_ADAPTERS,
  transactionImportAdapter,
} from './transaction-import.adapters';
import {
  TransactionBulkPrefill,
  TransactionImportDraftBatch,
  TransactionImportError,
  TransactionImportFormat,
} from './transaction-import.models';
import { TransactionsStore } from './transactions.store';

@Component({
  standalone: true,
  selector: 'app-transaction-import-form',
  imports: [FormsModule, NgIcon, TranslocoPipe],
  templateUrl: './transaction-import-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionImportFormComponent {
  protected readonly store = inject(TransactionsStore);
  protected readonly adapters = TRANSACTION_IMPORT_ADAPTERS;
  protected readonly csvHeaders = SPENDIST_CSV_HEADERS;
  protected readonly selectedFormat =
    signal<TransactionImportFormat>('spendist_csv');
  protected readonly csvMode = signal<'file' | 'paste'>('file');
  protected readonly pastedCsv = signal('');
  protected readonly sourceText = signal('');
  protected readonly fileName = signal('');
  protected readonly parsed = signal<TransactionImportDraftBatch | null>(null);
  protected readonly walletId = signal('');
  protected readonly categoryId = signal('');
  protected readonly placeId = signal('');
  protected readonly errorKey = signal<string | null>(null);
  protected readonly schemaOpen = signal(false);
  protected readonly processing = signal(false);

  readonly closed = output<void>();
  readonly prepared = output<TransactionBulkPrefill>();

  protected readonly closeIcon = heroXMark;
  protected readonly helpIcon = heroQuestionMarkCircle;
  protected readonly selectedAdapter = computed(() =>
    transactionImportAdapter(this.selectedFormat())
  );
  protected readonly canParse = computed(() =>
    this.selectedFormat() === 'spendist_csv' && this.csvMode() === 'paste'
      ? this.pastedCsv().trim().length > 0
      : this.sourceText().trim().length > 0
  );
  protected readonly canContinue = computed(() => {
    const parsed = this.parsed();
    return (
      !!parsed &&
      !!this.walletId() &&
      (parsed.format !== 'biedronka_e_receipt' || !!this.categoryId())
    );
  });

  protected selectFormat(format: TransactionImportFormat): void {
    this.selectedFormat.set(format);
    this.resetSource();
  }

  protected selectCsvMode(mode: 'file' | 'paste'): void {
    this.csvMode.set(mode);
    this.parsed.set(null);
    this.errorKey.set(null);
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.processing.set(true);
    this.errorKey.set(null);
    try {
      this.sourceText.set(await file.text());
      this.fileName.set(file.name);
      this.parseSource();
    } catch {
      this.errorKey.set('transactions.import.errors.read');
    } finally {
      this.processing.set(false);
    }
  }

  protected parseSource(): void {
    this.errorKey.set(null);
    try {
      const text =
        this.selectedFormat() === 'spendist_csv' && this.csvMode() === 'paste'
          ? this.pastedCsv()
          : this.sourceText();
      const batch = this.selectedAdapter().parse(text);
      this.parsed.set(batch);
      this.walletId.set(this.matchWallet(batch.walletName));
      this.categoryId.set('');
      this.placeId.set('');
    } catch (error) {
      this.parsed.set(null);
      this.errorKey.set(this.importErrorKey(error));
    }
  }

  protected continueToReview(): void {
    const batch = this.parsed();
    if (!batch || !this.canContinue()) return;
    const commonCategory =
      batch.format === 'biedronka_e_receipt' ? this.categoryId() : '';
    const selectedWallet = this.store
      .wallets()
      .find((wallet) => wallet.id === this.walletId());
    const sourceWalletMatched =
      batch.format === 'spendist_csv' &&
      !!batch.walletName &&
      !!selectedWallet &&
      this.normalize(batch.walletName) === this.normalize(selectedWallet.name);
    const rows = batch.rows.map((row) => ({
      ...row,
      categoryId: commonCategory || this.matchCategory(row.categoryPath),
      placeId:
        batch.format === 'biedronka_e_receipt' ? this.placeId() : row.placeId,
      importContext: {
        ...row.importContext,
        sourceAmountInDefault: sourceWalletMatched
          ? row.importContext.sourceAmountInDefault
          : null,
      },
    }));
    this.prepared.emit({
      mode: 'import',
      walletId: this.walletId(),
      direction: batch.direction,
      rows,
      duplicatesSkipped: 0,
    });
  }

  protected categoryLabel(categoryId: string): string {
    const categories = this.store.categories();
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return '';
    const path = [category.name];
    let parentId = category.parentId;
    while (parentId) {
      const parent = categories.find((item) => item.id === parentId);
      if (!parent) break;
      path.unshift(parent.name);
      parentId = parent.parentId;
    }
    const group = this.store
      .groups()
      .find((item) => item.id === category.groupId);
    return group ? `${group.name} / ${path.join(' / ')}` : path.join(' / ');
  }

  private matchWallet(name: string | null): string {
    if (!name)
      return this.store.defaultWalletId() ?? this.store.wallets()[0]?.id ?? '';
    const key = this.normalize(name);
    return (
      this.store.wallets().find((wallet) => this.normalize(wallet.name) === key)
        ?.id ?? ''
    );
  }

  private matchCategory(path: readonly string[]): string {
    if (path.length === 0) return '';
    const expected = path.map((part) => this.normalize(part));
    const leaf = expected.at(-1);
    const matches = this.store
      .categories()
      .filter((category) => this.normalize(category.name) === leaf);
    if (matches.length === 1) return matches[0].id;
    return (
      matches.find((category) => {
        const label = this.categoryLabel(category.id)
          .split('/')
          .map((part) => this.normalize(part));
        return expected.every((part) => label.includes(part));
      })?.id ?? ''
    );
  }

  private importErrorKey(error: unknown): string {
    if (!(error instanceof TransactionImportError))
      return 'transactions.import.errors.invalid';
    return `transactions.import.errors.${error.code}`;
  }

  private normalize(value: string): string {
    return value.trim().toLocaleLowerCase('pl-PL').replace(/\s+/g, ' ');
  }

  private resetSource(): void {
    this.sourceText.set('');
    this.pastedCsv.set('');
    this.fileName.set('');
    this.parsed.set(null);
    this.errorKey.set(null);
  }
}

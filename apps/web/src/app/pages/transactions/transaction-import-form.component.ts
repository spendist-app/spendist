import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import {
  heroArrowUpTray,
  heroClipboardDocument,
  heroQuestionMarkCircle,
  heroSparkles,
  heroXMark,
} from '@ng-icons/heroicons/outline';
import { TranslocoPipe } from '@ngneat/transloco';
import { LanguageService } from '../../core/language.service';
import { SPENDIST_CSV_HEADERS } from '../settings/spendist-csv-transfer.parser';
import {
  SPENDIST_UNGROUPED_CATEGORY,
  buildAiReceiptCsvPrompt,
} from './transaction-import-ai-prompt';
import {
  TRANSACTION_IMPORT_ADAPTERS,
  detectTransactionImport,
  transactionImportAdapter,
} from './transaction-import.adapters';
import {
  TransactionBulkPrefill,
  TransactionImportDetectedFormat,
  TransactionImportDraftBatch,
  TransactionImportError,
} from './transaction-import.models';
import { TransactionsStore } from './transactions.store';

@Component({
  standalone: true,
  selector: 'app-transaction-import-form',
  imports: [FormsModule, NgIcon, TranslocoPipe],
  templateUrl: './transaction-import-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionImportFormComponent implements OnDestroy {
  private pasteValidationTimer: ReturnType<typeof setTimeout> | null = null;
  private copyStatusTimer: ReturnType<typeof setTimeout> | null = null;
  private fileReadVersion = 0;
  protected readonly store = inject(TransactionsStore);
  private readonly languageService = inject(LanguageService);
  private readonly document = inject(DOCUMENT);
  protected readonly csvHeaders = SPENDIST_CSV_HEADERS;
  protected readonly sourceMode = signal<'file' | 'paste'>('file');
  protected readonly pastedCsv = signal('');
  protected readonly fileName = signal('');
  protected readonly detectedFormat =
    signal<TransactionImportDetectedFormat | null>(null);
  protected readonly parsed = signal<TransactionImportDraftBatch | null>(null);
  protected readonly walletId = signal('');
  protected readonly categoryId = signal('');
  protected readonly placeId = signal('');
  protected readonly errorKey = signal<string | null>(null);
  protected readonly schemaOpen = signal(false);
  protected readonly aiPromptOpen = signal(false);
  protected readonly aiPromptCopied = signal(false);
  protected readonly aiPromptCopyFailed = signal(false);
  protected readonly processing = signal(false);
  protected readonly dragActive = signal(false);
  private readonly fileInput =
    viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly closed = output<void>();
  readonly prepared = output<TransactionBulkPrefill>();

  protected readonly closeIcon = heroXMark;
  protected readonly helpIcon = heroQuestionMarkCircle;
  protected readonly uploadIcon = heroArrowUpTray;
  protected readonly aiIcon = heroSparkles;
  protected readonly copyIcon = heroClipboardDocument;
  protected readonly acceptedFileTypes = Array.from(
    new Set(
      TRANSACTION_IMPORT_ADAPTERS.flatMap((adapter) =>
        adapter.accept.split(',')
      )
    )
  ).join(',');
  protected readonly hasSource = computed(() =>
    this.sourceMode() === 'file'
      ? this.fileName().length > 0
      : this.pastedCsv().trim().length > 0
  );
  protected readonly canContinue = computed(() => {
    const parsed = this.parsed();
    return (
      !!parsed &&
      !!this.walletId() &&
      (parsed.format !== 'biedronka_e_receipt' || !!this.categoryId())
    );
  });
  protected readonly aiPromptReady = computed(
    () => this.store.wallets().length > 0 && this.store.categories().length > 0
  );
  protected readonly aiPromptActionTitleKey = computed(() =>
    this.store.wallets().length === 0
      ? 'transactions.import.ai.missingWallets'
      : this.store.categories().length === 0
      ? 'transactions.import.ai.missingCategories'
      : 'transactions.import.ai.action'
  );
  protected readonly aiPrompt = computed(() =>
    buildAiReceiptCsvPrompt({
      language: this.languageService.currentLanguage(),
      wallets: this.store.wallets().map((wallet) => ({
        name: wallet.name,
        currency: wallet.currency,
        isDefault: wallet.isDefault,
      })),
      groups: this.store.groups().map((group) => ({
        id: group.id,
        name: group.name,
      })),
      categories: this.store.categories().map((category) => ({
        id: category.id,
        name: category.name,
        groupId: category.groupId,
        parentId: category.parentId,
      })),
      tags: this.store.tags().map((tag) => tag.name),
      places: this.store.places().map((place) => ({ name: place.name })),
    })
  );

  ngOnDestroy(): void {
    this.clearPasteValidationTimer();
    this.clearCopyStatusTimer();
  }

  protected openAiPrompt(): void {
    if (!this.aiPromptReady()) return;
    this.aiPromptCopied.set(false);
    this.aiPromptCopyFailed.set(false);
    this.aiPromptOpen.set(true);
  }

  protected closeAiPrompt(): void {
    this.aiPromptOpen.set(false);
    this.clearCopyStatusTimer();
  }

  protected async copyAiPrompt(): Promise<void> {
    this.clearCopyStatusTimer();
    this.aiPromptCopied.set(false);
    this.aiPromptCopyFailed.set(false);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.aiPrompt());
      } else if (!this.copyWithTextarea(this.aiPrompt())) {
        throw new Error('Clipboard copy is unavailable.');
      }
      this.aiPromptCopied.set(true);
      this.copyStatusTimer = setTimeout(() => {
        this.aiPromptCopied.set(false);
        this.copyStatusTimer = null;
      }, 2500);
    } catch {
      this.aiPromptCopyFailed.set(true);
    }
  }

  protected selectSourceMode(mode: 'file' | 'paste'): void {
    if (this.sourceMode() === mode) return;
    this.sourceMode.set(mode);
    this.resetSource();
  }

  protected onPastedCsvChange(value: string): void {
    this.pastedCsv.set(value);
    this.resetValidation();
    this.processing.set(false);
    if (!value.trim()) return;

    this.detectedFormat.set('spendist_csv');
    this.processing.set(true);
    this.pasteValidationTimer = setTimeout(() => {
      this.pasteValidationTimer = null;
      this.validatePastedCsv();
    }, 300);
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await this.processFile(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
  }

  protected async onFileDropped(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragActive.set(false);
    const file = event.dataTransfer?.files[0];
    if (!file) return;
    await this.processFile(file);
  }

  protected removeFile(): void {
    this.fileReadVersion += 1;
    const input = this.fileInput()?.nativeElement;
    if (input) input.value = '';
    this.resetSource();
  }

  private async processFile(file: File): Promise<void> {
    const readVersion = ++this.fileReadVersion;
    this.processing.set(true);
    this.resetValidation();
    this.fileName.set(file.name);
    try {
      const text = await file.text();
      if (readVersion !== this.fileReadVersion) return;
      const detection = detectTransactionImport(text);
      this.detectedFormat.set(detection.format);
      if (detection.status === 'valid') {
        this.applyBatch(detection.batch);
      } else {
        this.errorKey.set(this.importErrorKey(detection.error));
      }
    } catch {
      if (readVersion !== this.fileReadVersion) return;
      this.detectedFormat.set('unknown');
      this.errorKey.set('transactions.import.errors.read');
    } finally {
      if (readVersion === this.fileReadVersion) {
        this.processing.set(false);
      }
    }
  }

  private validatePastedCsv(): void {
    try {
      const batch = transactionImportAdapter('spendist_csv').parse(
        this.pastedCsv()
      );
      this.applyBatch(batch);
    } catch (error) {
      this.errorKey.set(this.importErrorKey(error));
    } finally {
      this.processing.set(false);
    }
  }

  private applyBatch(batch: TransactionImportDraftBatch): void {
    this.parsed.set(batch);
    this.errorKey.set(null);
    this.walletId.set(this.matchWallet(batch.walletName));
    this.categoryId.set('');
    this.placeId.set('');
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
      categoryId:
        commonCategory ||
        this.matchCategory(row.categoryGroup, row.categoryPath),
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

  private matchCategory(groupName: string, path: readonly string[]): string {
    if (path.length === 0) return '';
    const expected = path.map((part) => this.normalize(part));
    const leaf = expected.at(-1);
    const leafMatches = this.store
      .categories()
      .filter((category) => this.normalize(category.name) === leaf);
    const normalizedGroupName = this.normalize(groupName);
    const matchingGroup = this.store
      .groups()
      .find((group) => this.normalize(group.name) === normalizedGroupName);
    const matches =
      normalizedGroupName === this.normalize(SPENDIST_UNGROUPED_CATEGORY)
        ? leafMatches.filter((category) => !category.groupId)
        : matchingGroup
        ? leafMatches.filter(
            (category) => category.groupId === matchingGroup.id
          )
        : leafMatches;
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
    this.fileReadVersion += 1;
    this.clearPasteValidationTimer();
    this.pastedCsv.set('');
    this.fileName.set('');
    this.processing.set(false);
    this.dragActive.set(false);
    this.resetValidation();
  }

  private resetValidation(): void {
    this.clearPasteValidationTimer();
    this.detectedFormat.set(null);
    this.parsed.set(null);
    this.errorKey.set(null);
    this.walletId.set('');
    this.categoryId.set('');
    this.placeId.set('');
  }

  private clearPasteValidationTimer(): void {
    if (this.pasteValidationTimer === null) return;
    clearTimeout(this.pasteValidationTimer);
    this.pasteValidationTimer = null;
  }

  private copyWithTextarea(value: string): boolean {
    const textarea = this.document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    this.document.body.appendChild(textarea);
    textarea.select();
    try {
      return this.document.execCommand('copy');
    } finally {
      textarea.remove();
    }
  }

  private clearCopyStatusTimer(): void {
    if (this.copyStatusTimer === null) return;
    clearTimeout(this.copyStatusTimer);
    this.copyStatusTimer = null;
  }
}

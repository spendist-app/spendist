import { ChangeDetectionStrategy, Component, OnDestroy, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { NgIcon } from '@ng-icons/core';
import { TransactionsStore, TransactionPresetId, TransactionViewModel } from './transactions.store';
import { heroIconSvg as heroIconSvgFn, formatHeroIconLabel as formatHeroIconLabelFn } from '../../shared/icons/heroicons';
import { LanguageService } from '../../core/language.service';
import type { LanguageCode } from '../../i18n/languages';
import { TransactionCreateFormComponent } from './transaction-create-form.component';

interface MonthYearOption {
  readonly value: string;
  readonly year: number;
  readonly month: number;
  readonly label: string;
}

@Component({
  standalone: true,
  selector: 'app-transactions-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, NgIcon, TransactionCreateFormComponent],
  providers: [TransactionsStore],
  templateUrl: './transactions.page.html',
})
export class TransactionsPageComponent implements OnDestroy {
  private readonly languageService = inject(LanguageService);
  protected readonly store = inject(TransactionsStore);
  protected readonly createFormOpen = signal(false);
  protected readonly formMode = signal<'create' | 'edit'>('create');
  protected readonly editingTransaction = signal<TransactionViewModel | null>(null);
  protected readonly duplicateTransaction = signal<TransactionViewModel | null>(null);
  protected readonly activeTransaction = computed(() => this.editingTransaction());
  protected readonly duplicateSource = computed(() => this.duplicateTransaction());
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly transloco = inject(TranslocoService);

  protected readonly heroIconSvg = heroIconSvgFn;
  protected readonly formatHeroIconLabel = formatHeroIconLabelFn;

  protected readonly filters = computed(() => this.store.activeFilters());
  protected readonly locale = computed(() => this.resolveLocale(this.languageService.currentLanguage()));
  protected readonly dateFormatter = computed(
    () =>
      new Intl.DateTimeFormat(this.locale(), {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }),
  );

  protected readonly presetButtons: readonly { id: TransactionPresetId; labelKey: string }[] = [
    { id: 'currentMonth', labelKey: 'transactions.filters.presets.currentMonth' },
    { id: 'previousMonth', labelKey: 'transactions.filters.presets.previousMonth' },
    { id: 'thisYear', labelKey: 'transactions.filters.presets.thisYear' },
    { id: 'lastYear', labelKey: 'transactions.filters.presets.lastYear' },
    { id: 'allTime', labelKey: 'transactions.filters.presets.allTime' },
  ];

  protected readonly monthYearOptions = computed(() => this.buildMonthYearOptions());
  protected readonly selectedMonthValue = computed(() => this.computeSelectedMonthValue());
  protected readonly selectedYearValue = computed(() => this.computeSelectedYearValue());

  protected readonly skeletonPlaceholders = Array.from({ length: 4 }, (_, index) => index);
  private readonly scrollLockEffect = effect(() => {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const body = this.document?.body;
    if (!body) {
      return;
    }
    body.classList.toggle('overflow-hidden', this.createFormOpen());
  });

  protected formatExpenseTotal(amount: number): string {
    const locale = this.locale();
    const currency = this.store.defaultCurrency();
    const value = amount === 0 ? 0 : -amount;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value);
  }

  protected formatAmount(transaction: TransactionViewModel): string {
    const locale = this.locale();
    const value = transaction.direction === 'expense' ? -transaction.amount : transaction.amount;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: transaction.currency,
      signDisplay: 'always',
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value);
  }

  protected shouldShowDefaultAmount(transaction: TransactionViewModel): boolean {
    const defaultCurrency = this.store.defaultCurrency();
    return (
      transaction.currency.toUpperCase() !== defaultCurrency.toUpperCase() &&
      Number.isFinite(transaction.amountInDefault) &&
      transaction.amountInDefault !== transaction.amount
    );
  }

  protected formatDefaultCurrencyAmount(transaction: TransactionViewModel): string {
    const defaultCurrency = this.store.defaultCurrency();
    const locale = this.locale();

    const amount = transaction.amountInDefault;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: defaultCurrency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  protected formatDate(date: Date): string {
    return this.dateFormatter().format(date);
  }

  protected formatDateInput(value: Date | null): string {
    if (!value) {
      return '';
    }

    const year = value.getUTCFullYear();
    const month = (value.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = value.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.store.setSearchTerm(target?.value ?? '');
  }

  protected onDateChange(kind: 'from' | 'to', event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const rawValue = input?.value ?? '';
    const filters = this.filters();
    const value = this.parseDateInput(rawValue);
    const from = kind === 'from' ? value : filters.from;
    const to = kind === 'to' ? value : filters.to;
    this.store.setCustomDateRange(from, to);
  }

  protected onPresetClick(preset: TransactionPresetId): void {
    this.store.applyPreset(preset);
  }

  protected onMonthSelect(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const rawValue = select?.value ?? '';
    if (!rawValue) {
      return;
    }

    const [yearSegment, monthSegment] = rawValue.split('-');
    const year = Number(yearSegment);
    const month = Number(monthSegment) - 1;
    if (Number.isInteger(year) && Number.isInteger(month) && month >= 0 && month <= 11) {
      this.store.setSelectedMonth(year, month);
    }
  }

  protected onYearSelect(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const rawValue = select?.value ?? '';
    if (!rawValue) {
      return;
    }

    const year = Number(rawValue);
    if (Number.isInteger(year)) {
      this.store.setSelectedYear(year);
    }
  }

  protected toggleCategorySelectionAndScroll(categoryId: string): void {
    this.store.toggleCategorySelection(categoryId);
    this.scrollToTransactionsResults();
  }

  protected clearCategorySelectionAndScroll(): void {
    this.store.clearCategorySelection();
    this.scrollToTransactionsResults();
  }

  protected trackTransaction(_index: number, transaction: TransactionViewModel): string {
    return transaction.id;
  }

  protected openCreateForm(): void {
    this.store.dismissMutationError();
    this.formMode.set('create');
    this.editingTransaction.set(null);
    this.duplicateTransaction.set(null);
    this.createFormOpen.set(true);
  }

  protected openEditForm(transaction: TransactionViewModel): void {
    this.store.dismissMutationError();
    this.formMode.set('edit');
    this.editingTransaction.set(transaction);
    this.duplicateTransaction.set(null);
    this.createFormOpen.set(true);
  }

  protected openDuplicate(transaction: TransactionViewModel): void {
    this.store.dismissMutationError();
    this.formMode.set('create');
    this.editingTransaction.set(null);
    this.duplicateTransaction.set(transaction);
    this.createFormOpen.set(true);
  }

  protected handleFormClosed(): void {
    this.createFormOpen.set(false);
    this.editingTransaction.set(null);
    this.duplicateTransaction.set(null);
    this.formMode.set('create');
    this.store.dismissMutationError();
  }

  protected async confirmDelete(transaction: TransactionViewModel): Promise<void> {
    if (this.store.transactionMutationPending()) {
      return;
    }

    let confirmed = true;
    if (isPlatformBrowser(this.platformId)) {
      confirmed = window.confirm(this.transloco.translate('transactions.list.actions.deleteConfirm'));
    }

    if (!confirmed) {
      return;
    }

    const result = await this.store.deleteTransaction(transaction.id);
    if (result.success) {
      const active = this.editingTransaction();
      const duplicate = this.duplicateTransaction();
      if ((active && active.id === transaction.id) || (duplicate && duplicate.id === transaction.id)) {
        this.handleFormClosed();
      }
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.document?.body?.classList.remove('overflow-hidden');
    }
  }

  private buildMonthYearOptions(): readonly MonthYearOption[] {
    const locale = this.locale();
    const formatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
    const transactions = this.store.transactions();
    const seen = new Set<string>();
    const options: MonthYearOption[] = [];

    for (const transaction of transactions) {
      const year = transaction.occurredAt.getUTCFullYear();
      const month = transaction.occurredAt.getUTCMonth();
      const key = `${year}-${month}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      options.push({
        value: `${year}-${(month + 1).toString().padStart(2, '0')}`,
        year,
        month,
        label: this.capitalize(formatter.format(new Date(Date.UTC(year, month, 1)))),
      });
    }

    if (options.length === 0) {
      const today = new Date();
      const fallbackYear = today.getUTCFullYear();
      const fallbackMonth = today.getUTCMonth();
      options.push({
        value: `${fallbackYear}-${(fallbackMonth + 1).toString().padStart(2, '0')}`,
        year: fallbackYear,
        month: fallbackMonth,
        label: this.capitalize(formatter.format(new Date(Date.UTC(fallbackYear, fallbackMonth, 1)))),
      });
    }

    return options.sort((a, b) => {
      if (a.year === b.year) {
        return b.month - a.month;
      }
      return b.year - a.year;
    });
  }

  private computeSelectedMonthValue(): string {
    const { from, to } = this.filters();
    if (!from || !to) {
      return '';
    }

    if (!this.isStartOfMonth(from) || !this.isEndOfMonth(to)) {
      return '';
    }

    const year = from.getUTCFullYear();
    const month = from.getUTCMonth() + 1;
    return `${year}-${month.toString().padStart(2, '0')}`;
  }

  private computeSelectedYearValue(): string {
    const { from, to } = this.filters();
    if (!from || !to) {
      return '';
    }

    if (!this.isStartOfYear(from) || !this.isEndOfYear(to)) {
      return '';
    }

    return `${from.getUTCFullYear()}`;
  }

  private resolveLocale(language: LanguageCode): string {
    switch (language) {
      case 'pl':
        return 'pl-PL';
      case 'en':
      default:
        return 'en-US';
    }
  }

  private parseDateInput(value: string): Date | null {
    if (!value) {
      return null;
    }

    const segments = value.split('-').map((segment) => Number(segment));
    if (segments.length !== 3) {
      return null;
    }

    const [year, month, day] = segments;
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      return null;
    }

    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  private scrollToTransactionsResults(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.document
      ?.getElementById('transactions-results')
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  private isStartOfMonth(date: Date): boolean {
    return date.getUTCDate() === 1 && date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
  }

  private isEndOfMonth(date: Date): boolean {
    const test = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    return date.getTime() === test.getTime();
  }

  private isStartOfYear(date: Date): boolean {
    return (
      date.getUTCMonth() === 0 &&
      date.getUTCDate() === 1 &&
      date.getUTCHours() === 0 &&
      date.getUTCMinutes() === 0 &&
      date.getUTCSeconds() === 0
    );
  }

  private isEndOfYear(date: Date): boolean {
    const test = new Date(Date.UTC(date.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
    return date.getTime() === test.getTime();
  }

  private capitalize(value: string): string {
    if (!value) {
      return value;
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

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
  template: `
    <section class="mx-auto w-full max-w-6xl px-4 py-10 sm:py-12 lg:py-16">
      <header class="space-y-2 text-center sm:text-left">
        <p class="badge badge-primary badge-outline text-xs uppercase tracking-wide">
          {{ 'transactions.badge' | transloco }}
        </p>
        <h1 class="text-3xl font-semibold sm:text-4xl">
          {{ 'transactions.title' | transloco }}
        </h1>
      </header>

      <div
        class="mt-10 grid gap-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)]"
      >
        @let filtersVm = filters();
        @let transactionsVm = store.filteredTransactions();
        <aside class="rounded-2xl border border-base-300 bg-base-100/80 shadow-sm backdrop-blur-sm">
          <div class="flex flex-col gap-4 p-4 sm:p-5">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold uppercase tracking-wide text-base-content/60">
                {{ 'transactions.filters.categoriesTitle' | transloco }}
              </h2>
              <button
                type="button"
                class="btn btn-ghost btn-xs"
                [disabled]="!store.hasActiveCategoryFilter()"
                (click)="store.clearCategorySelection()"
              >
                {{ 'transactions.filters.clearCategories' | transloco }}
              </button>
            </div>

            <button
              type="button"
              class="btn btn-outline btn-sm justify-start gap-3"
              [class.btn-active]="!store.hasActiveCategoryFilter()"
              (click)="store.clearCategorySelection()"
            >
              <span class="size-2 rounded-full bg-base-content/20" aria-hidden="true"></span>
              <span>{{ 'transactions.filters.allCategories' | transloco }}</span>
            </button>

            <nav class="space-y-5">
              @for (group of store.groupedCategories(); track group.id) {
                <section>
                  <header class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <span
                        class="size-2 rounded-full"
                        [style.backgroundColor]="group.color ?? '#CBD5F5'"
                        aria-hidden="true"
                      ></span>
                      <h3 class="text-sm font-semibold text-base-content">{{ group.name }}</h3>
                    </div>
                    <span class="text-xs text-base-content/50">
                      {{ group.categories.length }}
                    </span>
                  </header>
                  <div class="mt-3 space-y-2">
                    @for (category of group.categories; track category.id) {
                      <button
                        type="button"
                        class="btn btn-ghost btn-sm w-full justify-start gap-3 text-left"
                        [class.btn-active]="filtersVm.selectedCategoryIds.includes(category.id)"
                        (click)="store.toggleCategorySelection(category.id)"
                      >
                        <span
                          class="size-2 rounded-full"
                          [style.backgroundColor]="category.color ?? group.color ?? '#CBD5F5'"
                          aria-hidden="true"
                        ></span>
                        <span class="flex-1 truncate text-sm">{{ category.name }}</span>
                      </button>
                    }
                  </div>
                </section>
              }
            </nav>

            @if (store.ungroupedCategories().length > 0) {
              <section class="rounded-xl border border-dashed border-base-200 p-3">
                <h3 class="text-xs font-semibold uppercase tracking-wide text-base-content/50">
                  {{ 'transactions.filters.ungroupedTitle' | transloco }}
                </h3>
                <div class="mt-2 flex flex-wrap gap-2">
                  @for (category of store.ungroupedCategories(); track category.id) {
                    <button
                      type="button"
                      class="badge badge-outline gap-2"
                      [class.badge-primary]="filtersVm.selectedCategoryIds.includes(category.id)"
                      (click)="store.toggleCategorySelection(category.id)"
                    >
                      <span class="size-2 rounded-full bg-primary" aria-hidden="true"></span>
                      <span>{{ category.name }}</span>
                    </button>
                  }
                </div>
              </section>
            }
          </div>
        </aside>

        <div class="flex flex-col gap-6">
          <section class="rounded-2xl border border-base-300 bg-base-100/80 p-4 shadow-sm sm:p-6">
            <div class="flex flex-col gap-4">
              <div class="flex flex-wrap items-center gap-2">
                @for (preset of presetButtons; track preset.id) {
                  <button
                    type="button"
                    class="btn btn-sm"
                    [class.btn-primary]="filtersVm.preset === preset.id"
                    [class.btn-ghost]="filtersVm.preset !== preset.id"
                    (click)="onPresetClick(preset.id)"
                  >
                    {{ preset.labelKey | transloco }}
                  </button>
                }

                <button
                  type="button"
                  class="btn btn-link btn-sm ml-auto px-0"
                  (click)="store.resetFilters()"
                >
                  {{ 'transactions.filters.reset' | transloco }}
                </button>
              </div>

              <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label class="form-control">
                  <span class="label-text text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    {{ 'transactions.filters.searchLabel' | transloco }}
                  </span>
                  <input
                    type="search"
                    class="input input-bordered"
                    [value]="filtersVm.searchTerm"
                    (input)="onSearchInput($event)"
                    [placeholder]="'transactions.filters.searchPlaceholder' | transloco"
                    autocomplete="off"
                  />
                </label>

                <label class="form-control">
                  <span class="label-text text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    {{ 'transactions.filters.fromLabel' | transloco }}
                  </span>
                  <input
                    type="date"
                    class="input input-bordered"
                    [value]="formatDateInput(filtersVm.from)"
                    (change)="onDateChange('from', $event)"
                    [attr.max]="formatDateInput(filtersVm.to) || null"
                  />
                </label>

                <label class="form-control">
                  <span class="label-text text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    {{ 'transactions.filters.toLabel' | transloco }}
                  </span>
                  <input
                    type="date"
                    class="input input-bordered"
                    [value]="formatDateInput(filtersVm.to)"
                    (change)="onDateChange('to', $event)"
                    [attr.min]="formatDateInput(filtersVm.from) || null"
                  />
                </label>

                <label class="form-control">
                  <span class="label-text text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    {{ 'transactions.filters.monthLabel' | transloco }}
                  </span>
                  <select
                    class="select select-bordered"
                    [value]="selectedMonthValue()"
                    (change)="onMonthSelect($event)"
                  >
                    <option value="">
                      {{ 'transactions.filters.monthPlaceholder' | transloco }}
                    </option>
                    @for (option of monthYearOptions(); track option.value) {
                      <option [value]="option.value">
                        {{ option.label }}
                      </option>
                    }
                  </select>
                </label>
              </div>

              <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label class="form-control">
                  <span class="label-text text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    {{ 'transactions.filters.yearLabel' | transloco }}
                  </span>
                  <select
                    class="select select-bordered"
                    [value]="selectedYearValue()"
                    (change)="onYearSelect($event)"
                  >
                    <option value="">
                      {{ 'transactions.filters.yearPlaceholder' | transloco }}
                    </option>
                    @for (year of store.availableYears(); track year) {
                      <option [value]="year">
                        {{ year }}
                      </option>
                    }
                  </select>
                </label>

                <div class="form-control md:col-span-1 xl:col-span-3">
                  <span class="label-text text-xs font-semibold uppercase tracking-wide text-base-content/60">
                    {{ 'transactions.filters.summaryLabel' | transloco }}
                  </span>
                  <p class="rounded-xl border border-dashed border-base-200 bg-base-100 px-4 py-3 text-sm text-base-content/70">
                    {{ 'transactions.filters.summaryText' | transloco: { total: transactionsVm.length } }}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section class="space-y-4">
            @if (store.error(); as error) {
              <div
                class="alert alert-error flex-col items-start gap-2 rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error"
              >
                <div class="font-semibold">
                  {{ 'transactions.list.errorTitle' | transloco }}
                </div>
                <p>{{ error }}</p>
                <button type="button" class="btn btn-ghost btn-xs text-error" (click)="store.refresh()">
                  {{ 'transactions.list.retry' | transloco }}
                </button>
              </div>
            }

            @if (store.loading()) {
              <div class="space-y-3">
                @for (skeleton of skeletonPlaceholders; track skeleton) {
                  <div class="skeleton h-28 rounded-2xl"></div>
                }
              </div>
            } @else {
              @if (transactionsVm.length === 0) {
                <div
                  class="rounded-3xl border border-dashed border-base-300 bg-base-100/70 px-6 py-16 text-center text-base-content/60"
                >
                  <h3 class="text-lg font-semibold">
                    {{ 'transactions.list.emptyTitle' | transloco }}
                  </h3>
                  <p class="mt-2 text-sm">
                    {{ 'transactions.list.emptyBody' | transloco }}
                  </p>
                </div>
              } @else {
                <ul class="space-y-3">
                  @for (transaction of transactionsVm; track trackTransaction($index, transaction)) {
                    <li
                      class="border-l-4 rounded-2xl border border-base-300 bg-base-100/90 p-4 shadow-sm sm:p-5"
                      [style.borderLeftColor]="transaction.category?.color ?? '#CBD5F5'"
                    >
                      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex flex-1 items-start gap-4">
                          <div class="flex size-12 items-center justify-center rounded-xl bg-base-200">
                            @if (transaction.category?.icon; as iconKeyword) {
                              @if (heroIconSvg(iconKeyword); as iconSvg) {
                                <ng-icon
                                  [svg]="iconSvg"
                                  size="22"
                                  [style.color]="transaction.category?.color ?? '#0EA5A5'"
                                  aria-hidden="true"
                                ></ng-icon>
                                <span class="sr-only">
                                  {{
                                    'transactions.list.categoryIconSr' | transloco:
                                      { label: formatHeroIconLabel(iconKeyword) }
                                  }}
                                </span>
                              } @else {
                                <span class="text-lg font-semibold text-base-content">
                                  {{ transaction.category?.name?.charAt(0) ?? '•' }}
                                </span>
                              }
                            } @else {
                              <span class="text-lg font-semibold text-base-content">
                                {{ transaction.category?.name?.charAt(0) ?? '•' }}
                              </span>
                            }
                          </div>

                          <div class="flex flex-1 flex-col gap-1">
                            <div class="flex flex-wrap items-center gap-2">
                              <h3 class="text-base font-semibold text-base-content">
                                {{ transaction.description || ('transactions.list.noDescription' | transloco) }}
                              </h3>
                              @if (transaction.isAutomatic) {
                                <span class="badge badge-ghost badge-sm text-xs">
                                  {{ 'transactions.list.automatic' | transloco }}
                                </span>
                              }
                            </div>
                            <p class="text-sm text-base-content/70">
                              {{ formatDate(transaction.occurredAt) }} ·
                              {{ transaction.category?.name ?? ('transactions.list.uncategorized' | transloco) }}
                              @if (transaction.group; as group) {
                                · {{ group.name }}
                              }
                            </p>
                            <p class="text-xs uppercase tracking-wide text-base-content/40">
                              {{ ('transactions.list.direction.' + transaction.direction) | transloco }}
                            </p>
                          </div>
                        </div>

                        <div class="flex shrink-0 flex-col items-end gap-2 text-right">
                          <div class="flex items-center gap-2">
                            <button
                              type="button"
                              class="btn btn-ghost btn-xs"
                              (click)="openEditForm(transaction)"
                            >
                              {{ 'transactions.list.actions.edit' | transloco }}
                            </button>
                            <button
                              type="button"
                              class="btn btn-ghost btn-xs"
                              (click)="openDuplicate(transaction)"
                            >
                              {{ 'transactions.list.actions.duplicate' | transloco }}
                            </button>
                            <button
                              type="button"
                              class="btn btn-ghost btn-xs text-error"
                              [disabled]="store.transactionMutationPending()"
                              (click)="confirmDelete(transaction)"
                            >
                              {{ 'transactions.list.actions.delete' | transloco }}
                            </button>
                          </div>
                          <div class="flex flex-col items-end gap-1">
                            <span
                              class="text-lg font-semibold"
                              [class.text-success]="transaction.direction === 'income'"
                              [class.text-error]="transaction.direction === 'expense'"
                            >
                              {{ formatAmount(transaction) }}
                            </span>
                            <span class="text-xs text-base-content/50">
                              {{ transaction.currency }}
                              @if (shouldShowDefaultAmount(transaction)) {
                                <span class="block text-[0.65rem] text-base-content/60">
                                  ≈ {{ formatDefaultCurrencyAmount(transaction) }}
                                </span>
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  }
                </ul>
              }
            }
          </section>
        </div>
      </div>
    </section>

    <button
      type="button"
      class="btn btn-primary btn-circle fixed bottom-6 right-6 z-20 shadow-lg sm:bottom-8 sm:right-8"
      aria-label="{{ 'transactions.actions.add' | transloco }}"
      (click)="openCreateForm()"
    >
      <span aria-hidden="true" class="text-2xl leading-none">+</span>
      <span class="sr-only">{{ 'transactions.actions.add' | transloco }}</span>
    </button>

    @if (createFormOpen()) {
      @let mode = formMode();
      @let editing = activeTransaction();
      @let duplicate = duplicateSource();
      <app-transaction-create-form
        [mode]="mode"
        [transaction]="editing"
        [prefill]="duplicate"
        (closed)="handleFormClosed()"
      ></app-transaction-create-form>
    }
  `,
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
    if (!transaction.exchangeRate || transaction.exchangeRate <= 0) {
      return false;
    }

    return transaction.currency.toUpperCase() !== defaultCurrency.toUpperCase();
  }

  protected formatDefaultCurrencyAmount(transaction: TransactionViewModel): string {
    const defaultCurrency = this.store.defaultCurrency();
    const locale = this.locale();

    if (!transaction.exchangeRate || transaction.exchangeRate <= 0) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: defaultCurrency,
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }).format(0);
    }

    const amount = transaction.amount / transaction.exchangeRate;
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

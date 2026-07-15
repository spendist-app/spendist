import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { NgIcon } from '@ng-icons/core';
import {
  heroDocumentDuplicate,
  heroDocumentPlus,
  heroPencilSquare,
  heroPlus,
  heroTableCells,
  heroTrash,
} from '@ng-icons/heroicons/outline';
import {
  TransactionsStore,
  TransactionPresetId,
  TransactionSortId,
  TransactionViewModel,
} from './transactions.store';
import {
  heroIconSvg as heroIconSvgFn,
  formatHeroIconLabel as formatHeroIconLabelFn,
} from '../../shared/icons/heroicons';
import { LanguageService } from '../../core/language.service';
import type { LanguageCode } from '../../i18n/languages';
import { TransactionCreateFormComponent } from './transaction-create-form.component';
import type { TransactionFormSaveResult } from './transaction-create-form.component';
import { TransactionBulkCreateFormComponent } from './transaction-bulk-create-form.component';

interface MonthOption {
  readonly value: string;
  readonly label: string;
}

interface TransactionToast {
  readonly id: number;
  readonly messageKey: string;
  readonly params?: Record<string, unknown>;
}

@Component({
  standalone: true,
  selector: 'app-transactions-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoPipe,
    NgIcon,
    TransactionCreateFormComponent,
    TransactionBulkCreateFormComponent,
  ],
  providers: [TransactionsStore],
  templateUrl: './transactions.page.html',
})
export class TransactionsPageComponent implements OnDestroy {
  private readonly languageService = inject(LanguageService);
  protected readonly store = inject(TransactionsStore);
  protected readonly createFormOpen = signal(false);
  protected readonly bulkFormOpen = signal(false);
  protected readonly addMenuOpen = signal(false);
  private readonly addMenu = viewChild<ElementRef<HTMLElement>>('addMenu');
  protected readonly formMode = signal<'create' | 'edit'>('create');
  protected readonly editingTransaction = signal<TransactionViewModel | null>(
    null
  );
  protected readonly duplicateTransaction = signal<TransactionViewModel | null>(
    null
  );
  protected readonly transactionToasts = signal<readonly TransactionToast[]>(
    []
  );
  protected readonly activeTransaction = computed(() =>
    this.editingTransaction()
  );
  protected readonly duplicateSource = computed(() =>
    this.duplicateTransaction()
  );
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  private toastId = 0;
  private readonly toastTimers = new Map<
    number,
    ReturnType<typeof setTimeout>
  >();

  protected readonly heroIconSvg = heroIconSvgFn;
  protected readonly formatHeroIconLabel = formatHeroIconLabelFn;
  protected readonly editIcon = heroPencilSquare;
  protected readonly duplicateIcon = heroDocumentDuplicate;
  protected readonly deleteIcon = heroTrash;
  protected readonly addIcon = heroPlus;
  protected readonly addSingleIcon = heroDocumentPlus;
  protected readonly addBulkIcon = heroTableCells;

  protected readonly filters = computed(() => this.store.activeFilters());
  protected readonly locale = computed(() =>
    this.resolveLocale(this.languageService.currentLanguage())
  );
  protected readonly dateFormatter = computed(
    () =>
      new Intl.DateTimeFormat(this.locale(), {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      })
  );

  protected readonly presetButtons: readonly {
    id: TransactionPresetId;
    labelKey: string;
  }[] = [
    {
      id: 'currentMonth',
      labelKey: 'transactions.filters.presets.currentMonth',
    },
    {
      id: 'previousMonth',
      labelKey: 'transactions.filters.presets.previousMonth',
    },
    { id: 'thisYear', labelKey: 'transactions.filters.presets.thisYear' },
    { id: 'lastYear', labelKey: 'transactions.filters.presets.lastYear' },
  ];

  protected readonly monthOptions = computed(() => this.buildMonthOptions());
  protected readonly yearOptions = computed(() => this.buildYearOptions());
  protected readonly selectedMonthValue = computed(() =>
    this.computeSelectedMonthValue()
  );
  protected readonly selectedYearValue = computed(() =>
    this.computeSelectedYearValue()
  );
  protected readonly monthSelectionDisabled = computed(
    () => !this.selectedYearValue()
  );
  protected readonly sortOptions: readonly {
    readonly id: TransactionSortId;
    readonly labelKey: string;
  }[] = [
    { id: 'dateDesc', labelKey: 'transactions.filters.sort.dateDesc' },
    { id: 'dateAsc', labelKey: 'transactions.filters.sort.dateAsc' },
    { id: 'amountDesc', labelKey: 'transactions.filters.sort.amountDesc' },
    { id: 'amountAsc', labelKey: 'transactions.filters.sort.amountAsc' },
    {
      id: 'descriptionAsc',
      labelKey: 'transactions.filters.sort.descriptionAsc',
    },
    {
      id: 'descriptionDesc',
      labelKey: 'transactions.filters.sort.descriptionDesc',
    },
  ];
  protected readonly showOnlyCategoriesWithTransactions = signal(false);
  protected readonly sidebarTab = signal<'categories' | 'tags'>('categories');
  protected readonly visibleGroupedCategories = computed(() =>
    this.store
      .groupedCategories()
      .map((group) => ({
        ...group,
        categories: this.showOnlyCategoriesWithTransactions()
          ? group.categories.filter((category) =>
              this.categoryHasTransactions(category.id)
            )
          : group.categories,
      }))
      .filter((group) => group.categories.length > 0)
  );
  protected readonly visibleUngroupedCategories = computed(() => {
    const categories = this.store.ungroupedCategories();
    if (!this.showOnlyCategoriesWithTransactions()) {
      return categories;
    }

    return categories.filter((category) =>
      this.categoryHasTransactions(category.id)
    );
  });
  protected readonly visibleTags = computed(() =>
    this.store.visibleTagSummaries()
  );
  protected readonly sortedPlaces = computed(() =>
    [...this.store.places()].sort((left, right) =>
      left.name.localeCompare(right.name, this.locale())
    )
  );

  protected readonly skeletonPlaceholders = Array.from(
    { length: 4 },
    (_, index) => index
  );
  private readonly scrollLockEffect = effect(() => {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const body = this.document?.body;
    if (!body) {
      return;
    }
    body.classList.toggle(
      'overflow-hidden',
      this.createFormOpen() || this.bulkFormOpen()
    );
  });

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      this.handleKeyboardShortcut(event);
    };
    const handleClick = (event: MouseEvent) => {
      const menu = this.addMenu()?.nativeElement;
      if (this.addMenuOpen() && menu && !menu.contains(event.target as Node)) {
        this.closeAddMenu();
      }
    };
    this.document.addEventListener('keydown', handleKeydown);
    this.document.addEventListener('click', handleClick);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('keydown', handleKeydown);
      this.document.removeEventListener('click', handleClick);
    });
  }

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
    const value =
      transaction.direction === 'expense'
        ? -transaction.amount
        : transaction.amount;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: transaction.currency,
      signDisplay: 'always',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value);
  }

  protected shouldShowDefaultAmount(
    transaction: TransactionViewModel
  ): boolean {
    const defaultCurrency = this.store.defaultCurrency();
    return (
      transaction.currency.toUpperCase() !== defaultCurrency.toUpperCase() &&
      Number.isFinite(transaction.amountInDefault) &&
      transaction.amountInDefault !== transaction.amount
    );
  }

  protected formatDefaultCurrencyAmount(
    transaction: TransactionViewModel
  ): string {
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

  protected onCategoryFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const value = select?.value ?? '';
    if (value.startsWith('group:')) {
      this.store.setCategoryGroupSelection(value.slice('group:'.length));
    } else if (value.startsWith('category:')) {
      this.store.setCategorySelection(value.slice('category:'.length));
    } else if (!value) {
      this.store.setCategorySelection(null);
    }
    this.scrollToTransactionsResults();
  }

  protected onPlaceFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    this.store.setPlaceFilter(select?.value || null);
  }

  protected onAmountChange(kind: 'minimum' | 'maximum', event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const parsedValue =
      input && Number.isFinite(input.valueAsNumber)
        ? input.valueAsNumber
        : null;
    const filters = this.filters();
    this.store.setAmountRange(
      kind === 'minimum' ? parsedValue : filters.minimumAmount,
      kind === 'maximum' ? parsedValue : filters.maximumAmount
    );
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
    const year = Number(this.selectedYearValue());
    const month = Number(rawValue);
    if (
      rawValue === '' ||
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 0 ||
      month > 11
    ) {
      return;
    }

    this.store.setSelectedMonth(year, month);
    this.scrollToTransactionsResults();
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
      this.scrollToTransactionsResults();
    }
  }

  protected onSortSelect(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const sort = select?.value as TransactionSortId | undefined;
    if (!sort || !this.sortOptions.some((option) => option.id === sort)) {
      return;
    }

    this.store.setSort(sort);
    this.scrollToTransactionsResults();
  }

  protected onCategoryActivityFilterChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.showOnlyCategoriesWithTransactions.set(!!input?.checked);
  }

  protected toggleCategorySelectionAndScroll(categoryId: string): void {
    this.store.toggleCategorySelection(categoryId);
    this.scrollToTransactionsResults();
  }

  protected toggleCategoryGroupSelectionAndScroll(groupId: string): void {
    this.store.toggleCategoryGroupSelection(groupId);
    this.scrollToTransactionsResults();
  }

  protected clearCategorySelectionAndScroll(): void {
    this.store.clearCategorySelection();
    this.scrollToTransactionsResults();
  }

  protected toggleTagSelectionAndScroll(tagId: string): void {
    this.store.toggleTagSelection(tagId);
    this.scrollToTransactionsResults();
  }

  protected clearTagSelectionAndScroll(): void {
    this.store.clearTagSelection();
    this.scrollToTransactionsResults();
  }

  protected categoryHasTransactions(categoryId: string): boolean {
    return (
      this.store.categoryTransactionCount(categoryId) > 0 ||
      Math.abs(this.store.categoryExpenseTotal(categoryId)) > 0
    );
  }

  protected trackTransaction(
    _index: number,
    transaction: TransactionViewModel
  ): string {
    return transaction.id;
  }

  protected openCreateForm(): void {
    this.closeAddMenu();
    this.store.dismissMutationError();
    this.bulkFormOpen.set(false);
    this.formMode.set('create');
    this.editingTransaction.set(null);
    this.duplicateTransaction.set(null);
    this.createFormOpen.set(true);
  }

  protected handleKeyboardShortcut(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.addMenuOpen()) {
      event.preventDefault();
      this.closeAddMenu();
      return;
    }

    const isAddShortcut =
      event.key.toLowerCase() === 'n' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      (event.altKey || !this.isEditableShortcutTarget(event.target));

    if (
      event.defaultPrevented ||
      !isAddShortcut ||
      this.createFormOpen() ||
      this.bulkFormOpen()
    ) {
      return;
    }

    event.preventDefault();
    this.openCreateForm();
  }

  protected openEditForm(transaction: TransactionViewModel): void {
    this.store.dismissMutationError();
    this.bulkFormOpen.set(false);
    this.formMode.set('edit');
    this.editingTransaction.set(transaction);
    this.duplicateTransaction.set(null);
    this.createFormOpen.set(true);
  }

  protected openDuplicate(transaction: TransactionViewModel): void {
    this.store.dismissMutationError();
    this.bulkFormOpen.set(false);
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

  protected openBulkCreateForm(): void {
    this.closeAddMenu();
    this.handleFormClosed();
    this.store.dismissMutationError();
    this.bulkFormOpen.set(true);
  }

  protected openAddMenu(): void {
    this.addMenuOpen.set(true);
  }

  protected handleAddMenuPointerLeave(): void {
    const menu = this.addMenu()?.nativeElement;
    if (menu?.contains(this.document.activeElement)) {
      return;
    }
    this.closeAddMenu();
  }

  protected handleAddMenuFocusOut(event: FocusEvent): void {
    const menu = this.addMenu()?.nativeElement;
    const nextTarget = event.relatedTarget;
    if (menu && nextTarget instanceof Node && menu.contains(nextTarget)) {
      return;
    }
    this.closeAddMenu();
  }

  protected closeAddMenu(): void {
    this.addMenuOpen.set(false);
  }

  protected handleBulkFormClosed(): void {
    this.bulkFormOpen.set(false);
    this.store.dismissMutationError();
  }

  protected handleFormSaved(result: TransactionFormSaveResult): void {
    this.showToast(
      result === 'created'
        ? 'transactions.toasts.created'
        : 'transactions.toasts.updated'
    );
  }

  protected handleBulkFormSaved(count: number): void {
    this.showToast('transactions.toasts.bulkCreated', { count });
  }

  private showToast(
    messageKey: string,
    params?: Record<string, unknown>
  ): void {
    const id = ++this.toastId;

    this.transactionToasts.update((toasts) => [
      ...toasts,
      {
        id,
        messageKey,
        params,
      },
    ]);

    const timer = setTimeout(() => {
      this.dismissToast(id);
    }, 3500);
    this.toastTimers.set(id, timer);
  }

  protected dismissToast(id: number): void {
    const timer = this.toastTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.toastTimers.delete(id);
    }
    this.transactionToasts.update((toasts) =>
      toasts.filter((toast) => toast.id !== id)
    );
  }

  protected async confirmDelete(
    transaction: TransactionViewModel
  ): Promise<void> {
    if (this.store.transactionMutationPending()) {
      return;
    }

    let confirmed = true;
    if (isPlatformBrowser(this.platformId)) {
      confirmed = window.confirm(
        this.transloco.translate('transactions.list.actions.deleteConfirm')
      );
    }

    if (!confirmed) {
      return;
    }

    const result = await this.store.deleteTransaction(transaction.id);
    if (result.success) {
      const active = this.editingTransaction();
      const duplicate = this.duplicateTransaction();
      if (
        (active && active.id === transaction.id) ||
        (duplicate && duplicate.id === transaction.id)
      ) {
        this.handleFormClosed();
      }
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.document?.body?.classList.remove('overflow-hidden');
    }
    for (const timer of this.toastTimers.values()) {
      clearTimeout(timer);
    }
    this.toastTimers.clear();
  }

  private buildMonthOptions(): readonly MonthOption[] {
    const locale = this.locale();
    const formatter = new Intl.DateTimeFormat(locale, {
      month: 'long',
    });
    return Array.from({ length: 12 }, (_, month) => ({
      value: `${month}`,
      label: this.capitalize(
        formatter.format(new Date(Date.UTC(2020, month, 1)))
      ),
    }));
  }

  private buildYearOptions(): readonly number[] {
    const years = new Set(this.store.availableYears());
    years.add(new Date().getUTCFullYear());
    const { from, to } = this.filters();
    if (from) {
      years.add(from.getUTCFullYear());
    }
    if (to) {
      years.add(to.getUTCFullYear());
    }
    return [...years].sort((a, b) => b - a);
  }

  private computeSelectedMonthValue(): string {
    const { from, to } = this.filters();
    if (!from || !to) {
      return '';
    }

    if (!this.isStartOfMonth(from) || !this.isEndOfMonth(to)) {
      return '';
    }

    if (
      from.getUTCFullYear() !== to.getUTCFullYear() ||
      from.getUTCMonth() !== to.getUTCMonth()
    ) {
      return '';
    }

    return `${from.getUTCMonth()}`;
  }

  private computeSelectedYearValue(): string {
    const { from, to } = this.filters();
    if (!from || !to) {
      return '';
    }

    if (from.getUTCFullYear() !== to.getUTCFullYear()) {
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
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day)
    ) {
      return null;
    }

    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  private scrollToTransactionsResults(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const results = this.document?.getElementById('transactions-results');
    results?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  }

  private isEditableShortcutTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const tagName = target.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      target.isContentEditable
    );
  }

  private isStartOfMonth(date: Date): boolean {
    return (
      date.getUTCDate() === 1 &&
      date.getUTCHours() === 0 &&
      date.getUTCMinutes() === 0 &&
      date.getUTCSeconds() === 0
    );
  }

  private isEndOfMonth(date: Date): boolean {
    const test = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        0,
        23,
        59,
        59,
        999
      )
    );
    return date.getTime() === test.getTime();
  }

  private capitalize(value: string): string {
    if (!value) {
      return value;
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

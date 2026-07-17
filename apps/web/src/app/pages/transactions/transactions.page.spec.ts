import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import type { LanguageCode } from '../../i18n/languages';
import { provideAppTransloco } from '../../i18n/transloco.providers';
import { LanguageService } from '../../core/language.service';
import { TransactionsPageComponent } from './transactions.page';
import { TransactionsStore, TransactionViewModel } from './transactions.store';

class LanguageServiceStub {
  readonly currentLanguage = signal<LanguageCode>('en');
}

class TransactionsStoreStub {
  readonly defaultCurrency = signal('PLN');
  readonly activeFilters = signal({
    selectedCategoryIds: [],
    selectedTagIds: [],
    selectedPlaceId: null,
    minimumAmount: null,
    maximumAmount: null,
    searchTerm: '',
    from: null,
    to: null,
    preset: 'allTime',
    sort: 'dateDesc',
  });
  readonly transactions = signal([]);
  readonly filteredTransactions = signal([]);
  readonly groupedCategories = signal([
    {
      id: 'group-1',
      ownerId: 'user-1',
      name: 'Daily',
      color: null,
      icon: null,
      categories: [
        {
          id: 'category-active',
          ownerId: 'user-1',
          name: 'Groceries',
          color: null,
          icon: null,
          groupId: 'group-1',
          parentId: null,
        },
        {
          id: 'category-empty',
          ownerId: 'user-1',
          name: 'Empty category',
          color: null,
          icon: null,
          groupId: 'group-1',
          parentId: null,
        },
      ],
    },
  ]);
  readonly ungroupedCategories = signal([
    {
      id: 'category-ungrouped-active',
      ownerId: 'user-1',
      name: 'Loose active',
      color: null,
      icon: null,
      groupId: '',
      parentId: null,
    },
    {
      id: 'category-ungrouped-empty',
      ownerId: 'user-1',
      name: 'Loose empty',
      color: null,
      icon: null,
      groupId: '',
      parentId: null,
    },
  ]);
  readonly hasActiveCategoryFilter = signal(false);
  readonly hasActiveTagFilter = signal(false);
  readonly visibleTagSummaries = signal([
    {
      id: 'tag-active',
      ownerId: 'user-1',
      name: 'Home',
      color: null,
      icon: null,
      totalAmount: 30,
      transactionCount: 1,
    },
  ]);
  readonly places = signal([
    {
      id: 'place-1',
      ownerId: 'user-1',
      name: 'Market',
      street: null,
      city: null,
      postalCode: null,
      country: null,
      note: null,
    },
  ]);
  readonly selectedCategoryFilterValue = signal('');
  readonly loading = signal(false);
  readonly error = signal(null);
  readonly transactionMutationPending = signal(false);
  readonly loadedTransactionCount = signal(0);
  readonly totalMatchingTransactions = signal(0);
  readonly hasMoreTransactions = signal(false);
  readonly loadingMoreTransactions = signal(false);
  readonly availableYears = signal([2026]);

  overallExpenseTotal(): number {
    return 0;
  }

  groupExpenseTotal(): number {
    return 0;
  }

  categoryExpenseTotal(categoryId: string): number {
    if (categoryId === 'category-active') {
      return 25;
    }

    return 0;
  }

  categoryTransactionCount(categoryId: string): number {
    if (
      categoryId === 'category-active' ||
      categoryId === 'category-ungrouped-active'
    ) {
      return 1;
    }

    return 0;
  }

  clearCategorySelection(): void {
    return;
  }

  toggleCategorySelection(): void {
    return;
  }

  toggleCategoryGroupSelection(): void {
    return;
  }

  isCategoryGroupSelected(): boolean {
    return false;
  }

  setCategorySelection(): void {
    return;
  }

  setCategoryGroupSelection(): void {
    return;
  }

  setPlaceFilter(): void {
    return;
  }

  setAmountRange(): void {
    return;
  }

  setSelectedYear(): void {
    return;
  }

  setSelectedMonth(): void {
    return;
  }

  setSort(): void {
    return;
  }

  selectAllCategories(): void {
    return;
  }

  clearTagSelection(): void {
    return;
  }

  toggleTagSelection(): void {
    return;
  }

  dismissMutationError(): void {
    return;
  }

  resetFilters(): void {
    return;
  }
}

describe('TransactionsPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionsPageComponent],
      providers: [
        ...provideAppTransloco(),
        {
          provide: LanguageService,
          useClass: LanguageServiceStub,
        },
      ],
    })
      .overrideComponent(TransactionsPageComponent, {
        set: {
          providers: [
            {
              provide: TransactionsStore,
              useClass: TransactionsStoreStub,
            },
          ],
        },
      })
      .compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the category and tag tabs as the only filter heading', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();

    const sidebar = fixture.nativeElement.querySelector('aside') as HTMLElement;
    const tabs = Array.from(
      sidebar.querySelectorAll<HTMLElement>('[role="tab"]')
    );

    expect(sidebar.querySelector('h2')).toBeNull();
    expect(tabs).toHaveLength(2);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
    ]);
  });

  it('formats transaction amounts with the standard locale currency placement from Intl', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    const component = fixture.componentInstance as unknown as {
      formatAmount(transaction: TransactionViewModel): string;
    };
    const transaction = {
      amount: 1234.56,
      amountInDefault: 1234.56,
      currency: 'PLN',
      direction: 'expense',
    } as TransactionViewModel;

    expect(component.formatAmount(transaction)).toBe(
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'PLN',
        signDisplay: 'always',
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }).format(-1234.56)
    );
  });

  it('formats category totals with the active locale and default currency', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    const language = TestBed.inject(
      LanguageService
    ) as unknown as LanguageServiceStub;
    const store = fixture.debugElement.injector.get(
      TransactionsStore
    ) as unknown as TransactionsStoreStub;
    const component = fixture.componentInstance as unknown as {
      formatExpenseTotal(amount: number): string;
    };

    language.currentLanguage.set('pl');
    store.defaultCurrency.set('PLN');

    expect(component.formatExpenseTotal(1234.56)).toBe(
      new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }).format(-1234.56)
    );
  });

  it('can hide categories without transactions from the category filter', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      onCategoryActivityFilterChange(event: Event): void;
      visibleGroupedCategories(): readonly Array<{
        readonly categories: readonly { readonly id: string }[];
      }>;
      visibleUngroupedCategories(): readonly { readonly id: string }[];
    };
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = true;
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: input });

    component.onCategoryActivityFilterChange(event);

    expect(
      component
        .visibleGroupedCategories()[0]
        ?.categories.map((category) => category.id)
    ).toEqual(['category-active']);
    expect(
      component.visibleUngroupedCategories().map((category) => category.id)
    ).toEqual(['category-ungrouped-active']);
  });

  it('keeps advanced filters collapsed until requested', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();

    const search = fixture.nativeElement.querySelector(
      '[data-testid="transaction-search-filter"]'
    ) as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector(
      '[data-testid="transaction-advanced-filters-toggle"]'
    ) as HTMLButtonElement;

    expect(search.closest('label')?.classList.contains('sm:col-span-2')).toBe(
      true
    );
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-category-filter"]'
      )
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-place-filter"]'
      )
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-minimum-amount-filter"]'
      )
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-maximum-amount-filter"]'
      )
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-year-filter"]'
      )
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-month-filter"]'
      )
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-sort-filter"]'
      )
    ).toBeNull();

    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-place-filter"]'
      )
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-minimum-amount-filter"]'
      )
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-maximum-amount-filter"]'
      )
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-year-filter"]'
      )
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-month-filter"]'
      )
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-sort-filter"]'
      )
    ).not.toBeNull();
  });

  it('requires a year before exposing all twelve months', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-advanced-filters-toggle"]'
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    const store = fixture.debugElement.injector.get(
      TransactionsStore
    ) as unknown as TransactionsStoreStub;
    let month = fixture.nativeElement.querySelector(
      '[data-testid="transaction-month-filter"]'
    ) as HTMLSelectElement;

    expect(month.disabled).toBe(true);

    store.activeFilters.update((filters) => ({
      ...filters,
      from: new Date(Date.UTC(2026, 0, 1)),
      to: new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999)),
      preset: 'custom',
    }));
    fixture.detectChanges();
    month = fixture.nativeElement.querySelector(
      '[data-testid="transaction-month-filter"]'
    ) as HTMLSelectElement;

    expect(month.disabled).toBe(false);
    expect(month.options).toHaveLength(13);
  });

  it('passes year, month, and sort selections to the store', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    const store = fixture.debugElement.injector.get(
      TransactionsStore
    ) as unknown as TransactionsStoreStub;
    const setYear = vi.spyOn(store, 'setSelectedYear');
    const setMonth = vi.spyOn(store, 'setSelectedMonth');
    const setSort = vi.spyOn(store, 'setSort');
    const component = fixture.componentInstance as unknown as {
      onYearSelect(event: Event): void;
      onMonthSelect(event: Event): void;
      onSortSelect(event: Event): void;
    };

    component.onYearSelect(eventWithSelectValue('2026'));
    store.activeFilters.update((filters) => ({
      ...filters,
      from: new Date(Date.UTC(2026, 0, 1)),
      to: new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999)),
    }));
    component.onMonthSelect(eventWithSelectValue('5'));
    component.onSortSelect(eventWithSelectValue('amountDesc'));

    expect(setYear).toHaveBeenCalledWith(2026);
    expect(setMonth).toHaveBeenCalledWith(2026, 5);
    expect(setSort).toHaveBeenCalledWith('amountDesc');
  });

  it('shows category checkboxes only in filter mode and applies a whole group', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    const store = fixture.debugElement.injector.get(
      TransactionsStore
    ) as unknown as TransactionsStoreStub;
    const toggleGroup = vi.spyOn(store, 'toggleCategoryGroupSelection');
    const modeToggle = fixture.nativeElement.querySelector(
      '[data-testid="category-filter-mode-toggle"]'
    ) as HTMLInputElement;

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="category-group-filter-checkbox"]'
      )
    ).toBeNull();

    modeToggle.checked = true;
    modeToggle.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const groupCheckbox = fixture.nativeElement.querySelector(
      '[data-testid="category-group-filter-checkbox"]'
    ) as HTMLInputElement;
    groupCheckbox.checked = true;
    groupCheckbox.dispatchEvent(new Event('change'));

    expect(toggleGroup).toHaveBeenCalledWith('group-1');
  });

  it('selects and deselects all categories from filter mode actions', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    const store = fixture.debugElement.injector.get(
      TransactionsStore
    ) as unknown as TransactionsStoreStub;
    const selectAll = vi.spyOn(store, 'selectAllCategories');
    const clearAll = vi.spyOn(store, 'clearCategorySelection');
    const modeToggle = fixture.nativeElement.querySelector(
      '[data-testid="category-filter-mode-toggle"]'
    ) as HTMLInputElement;

    modeToggle.checked = true;
    modeToggle.dispatchEvent(new Event('change'));
    store.hasActiveCategoryFilter.set(true);
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="category-filter-select-all"]'
      ) as HTMLButtonElement
    ).click();
    (
      fixture.nativeElement.querySelector(
        '[data-testid="category-filter-clear-all"]'
      ) as HTMLButtonElement
    ).click();

    expect(selectAll).toHaveBeenCalledOnce();
    expect(clearAll).toHaveBeenCalledOnce();
  });

  it('passes place and amount range changes to the store', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-advanced-filters-toggle"]'
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    const store = fixture.debugElement.injector.get(
      TransactionsStore
    ) as unknown as TransactionsStoreStub;
    const setPlace = vi.spyOn(store, 'setPlaceFilter');
    const setAmountRange = vi.spyOn(store, 'setAmountRange');
    const place = fixture.nativeElement.querySelector(
      '[data-testid="transaction-place-filter"]'
    ) as HTMLSelectElement;
    const minimumAmount = fixture.nativeElement.querySelector(
      '[data-testid="transaction-minimum-amount-filter"]'
    ) as HTMLInputElement;

    place.value = 'place-1';
    place.dispatchEvent(new Event('change'));
    minimumAmount.value = '12.5';
    minimumAmount.dispatchEvent(new Event('change'));

    expect(setPlace).toHaveBeenCalledWith('place-1');
    expect(setAmountRange).toHaveBeenCalledWith(12.5, null);
  });

  it('opens the create transaction form with the N keyboard shortcut', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      createFormOpen(): boolean;
    };

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      bubbles: true,
    });
    document.dispatchEvent(event);

    expect(component.createFormOpen()).toBe(true);
  });

  it('opens the create transaction form with Alt+N from an input', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      createFormOpen(): boolean;
    };

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'n',
        altKey: true,
        bubbles: true,
      })
    );
    input.remove();

    expect(component.createFormOpen()).toBe(true);
  });

  it('does not open the create form when N is typed in an input', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      createFormOpen(): boolean;
    };

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'n',
        bubbles: true,
      })
    );
    input.remove();

    expect(component.createFormOpen()).toBe(false);
  });

  it('opens the add action menu from the main add button', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      addMenuOpen(): boolean;
      createFormOpen(): boolean;
    };
    const addButton = fixture.nativeElement.querySelector(
      '[data-testid="transaction-add-menu-trigger"]'
    ) as HTMLElement;

    addButton.click();

    expect(component.addMenuOpen()).toBe(true);
    expect(component.createFormOpen()).toBe(false);
  });

  it('opens single entry from the add action menu', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      createFormOpen(): boolean;
    };
    const addButton = fixture.nativeElement.querySelector(
      '[data-testid="transaction-add-menu-trigger"]'
    ) as HTMLButtonElement;

    addButton.click();
    fixture.detectChanges();
    const singleButton = fixture.nativeElement.querySelector(
      '#transaction-add-actions button:first-child'
    ) as HTMLButtonElement;
    singleButton.click();

    expect(component.createFormOpen()).toBe(true);
  });

  it('opens bulk entry from the add speed dial', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      bulkFormOpen(): boolean;
    };
    const addButton = fixture.nativeElement.querySelector(
      '[data-testid="transaction-add-menu-trigger"]'
    ) as HTMLButtonElement;
    addButton.click();
    fixture.detectChanges();
    const bulkButton = fixture.nativeElement.querySelector(
      '#transaction-add-actions button:last-child'
    ) as HTMLButtonElement;

    bulkButton.click();

    expect(component.bulkFormOpen()).toBe(true);
  });

  it('closes the add speed dial with Escape', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      addMenuOpen(): boolean;
      openAddMenu(): void;
    };
    component.openAddMenu();
    fixture.detectChanges();

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    fixture.detectChanges();

    expect(component.addMenuOpen()).toBe(false);
    expect(
      fixture.nativeElement.querySelector('#transaction-add-actions')
    ).toBeNull();
  });

  it('shows a transient toast after a transaction is saved', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      handleFormSaved(result: 'created'): void;
      transactionToasts(): readonly { readonly messageKey: string }[];
    };

    component.handleFormSaved('created');
    fixture.detectChanges();

    expect(component.transactionToasts().length).toBe(1);
    expect(component.transactionToasts()[0]?.messageKey).toBe(
      'transactions.toasts.created'
    );

    vi.advanceTimersByTime(3500);
    fixture.detectChanges();

    expect(component.transactionToasts().length).toBe(0);
  });
});

function eventWithSelectValue(value: string): Event {
  const select = document.createElement('select');
  const option = document.createElement('option');
  option.value = value;
  select.append(option);
  select.value = value;
  const event = new Event('change');
  Object.defineProperty(event, 'target', { value: select });
  return event;
}

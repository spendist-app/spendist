import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

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
    searchTerm: '',
    from: null,
    to: null,
    preset: 'allTime',
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

  dismissMutationError(): void {
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
      }).format(-1234.56),
    );
  });

  it('formats category totals with the active locale and default currency', () => {
    const fixture = TestBed.createComponent(TransactionsPageComponent);
    const language = TestBed.inject(LanguageService) as unknown as LanguageServiceStub;
    const store = fixture.debugElement.injector.get(TransactionsStore) as unknown as TransactionsStoreStub;
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
      }).format(-1234.56),
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
      component.visibleGroupedCategories()[0]?.categories.map(
        (category) => category.id
      )
    ).toEqual(['category-active']);
    expect(
      component
        .visibleUngroupedCategories()
        .map((category) => category.id)
    ).toEqual(['category-ungrouped-active']);
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
});

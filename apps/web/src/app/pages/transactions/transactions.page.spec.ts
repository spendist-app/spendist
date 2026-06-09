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
  readonly groupedCategories = signal([]);
  readonly ungroupedCategories = signal([]);
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

  categoryExpenseTotal(): number {
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
});

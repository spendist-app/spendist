import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAppTransloco } from '../../i18n/transloco.providers';
import { TransactionCreateFormComponent } from './transaction-create-form.component';
import { TransactionsStore } from './transactions.store';

class TransactionsStoreStub {
  readonly categories = signal([
    {
      id: 'category-1',
      name: 'Food',
      color: null,
      icon: null,
      groupId: null,
      parentId: null,
    },
  ]);
  readonly groupedCategories = signal([]);
  readonly ungroupedCategories = signal(this.categories());
  readonly tags = signal([]);
  readonly wallets = signal([
    {
      id: 'wallet-1',
      ownerId: 'user-1',
      name: 'Default Wallet',
      isDefault: true,
      currencyId: 1,
      currency: 'PLN',
    },
  ]);
  readonly currencies = signal([
    { id: 1, symbol: 'PLN' },
    { id: 2, symbol: 'EUR' },
    { id: 3, symbol: 'USD' },
  ]);
  readonly defaultCurrency = signal('PLN');
  readonly defaultWalletId = signal('wallet-1');
  readonly transactionMutationPending = signal(false);
  readonly mutationError = signal(null);

  dismissMutationError(): void {
    return;
  }

  async ensureTags(): Promise<[]> {
    return [];
  }

  async createTransactions(): Promise<{ success: true }> {
    return { success: true };
  }

  async updateTransaction(): Promise<{ success: true }> {
    return { success: true };
  }
}

describe('TransactionCreateFormComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionCreateFormComponent],
      providers: [
        {
          provide: TransactionsStore,
          useClass: TransactionsStoreStub,
        },
        ...provideAppTransloco(),
      ],
    }).compileComponents();
  });

  it('shows all application currencies in the amount selector', () => {
    const fixture = TestBed.createComponent(TransactionCreateFormComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const currencySelect = compiled.querySelector(
      'select[formControlName="currency"]',
    ) as HTMLSelectElement | null;
    const options = Array.from(currencySelect?.options ?? []).map((option) => option.value);

    expect(options).toEqual(['PLN', 'EUR', 'USD']);
  });
});

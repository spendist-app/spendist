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
  readonly places = signal([
    {
      id: 'place-1',
      ownerId: 'user-1',
      name: 'Barber',
      street: 'Main 1',
      city: 'Zebrzydowice',
      postalCode: null,
      country: null,
      note: null,
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
  getExchangeRateCalls = 0;

  dismissMutationError(): void {
    return;
  }

  async ensureTags(): Promise<[]> {
    return [];
  }

  async getExchangeRate(): Promise<number> {
    this.getExchangeRateCalls += 1;
    return 4;
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
      'select[formControlName="currency"]'
    ) as HTMLSelectElement | null;
    const options = Array.from(currencySelect?.options ?? []).map(
      (option) => option.value
    );

    expect(options).toEqual(['PLN', 'EUR', 'USD']);
  });

  it('updates default amount from exchange rate in edit mode', async () => {
    const fixture = TestBed.createComponent(TransactionCreateFormComponent);
    const store = TestBed.inject(
      TransactionsStore
    ) as unknown as TransactionsStoreStub;
    fixture.componentRef.setInput('mode', 'edit');
    fixture.componentRef.setInput('transaction', {
      id: 'transaction-1',
      ownerId: 'user-1',
      categoryId: 'category-1',
      occurredAt: new Date(Date.UTC(2026, 4, 29)),
      description: 'Foreign transaction',
      amount: 10,
      amountInDefault: 35,
      currency: 'USD',
      direction: 'expense',
      isAutomatic: false,
      recurringTransactionId: null,
      recurringScheduledFor: null,
      exchangeRate: null,
      walletId: 'wallet-1',
      placeId: 'place-1',
      category: null,
      group: null,
      tagIds: [],
      place: null,
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const currencySelect = compiled.querySelector(
      'select[formControlName="currency"]'
    ) as HTMLSelectElement;
    expect(currencySelect.value).toBe('USD');

    compiled
      .querySelector<HTMLButtonElement>('button[aria-expanded="false"]')
      ?.click();
    fixture.detectChanges();

    const defaultAmountInput = compiled.querySelector(
      'input[formControlName="foreignAmount"]'
    ) as HTMLInputElement;
    defaultAmountInput.value = '1';
    defaultAmountInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    compiled
      .querySelector<HTMLButtonElement>('button.btn-outline.mt-2')
      ?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(store.getExchangeRateCalls).toBeGreaterThan(0);
    expect(defaultAmountInput.value).toBe('40.00');
  });
});

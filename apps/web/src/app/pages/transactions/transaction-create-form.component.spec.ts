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
    {
      id: 'category-2',
      name: 'Transport',
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
  createTransactionsCalls = 0;

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
    this.createTransactionsCalls += 1;
    return { success: true };
  }

  async updateTransaction(): Promise<{ success: true }> {
    return { success: true };
  }
}

describe('TransactionCreateFormComponent', () => {
  const recentDefaultsStorageKey = 'spendist.transactionForm.recentDefaults';

  beforeEach(async () => {
    sessionStorage.clear();

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

  afterEach(() => {
    sessionStorage.clear();
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

  it('focuses the full-width description field when creating a transaction', async () => {
    const fixture = TestBed.createComponent(TransactionCreateFormComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const descriptionInput = compiled.querySelector(
      'input[formControlName="description"]'
    ) as HTMLInputElement | null;

    expect(descriptionInput).not.toBeNull();
    expect(descriptionInput?.parentElement?.classList).toContain(
      'sm:col-span-2'
    );
    expect(document.activeElement).toBe(descriptionInput);
  });

  it('uses recent create date and category from session storage', () => {
    sessionStorage.setItem(
      recentDefaultsStorageKey,
      JSON.stringify({
        occurredOn: '2026-06-15',
        categoryId: 'category-2',
      })
    );

    const fixture = TestBed.createComponent(TransactionCreateFormComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component['form'].controls.occurredOn.value).toBe('2026-06-15');
    expect(component['form'].controls.categoryId.value).toBe('category-2');
  });

  it('sets the transaction date to today from the date helper action', () => {
    const fixture = TestBed.createComponent(TransactionCreateFormComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component['form'].controls.occurredOn.setValue('2026-06-01');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const dateInput = compiled.querySelector<HTMLInputElement>(
      'input[formControlName="occurredOn"]'
    );
    const setTodayButton =
      dateInput?.parentElement?.querySelector<HTMLButtonElement>('button');
    setTodayButton?.click();
    fixture.detectChanges();

    const today = new Date();
    const expectedDate = [
      today.getUTCFullYear(),
      String(today.getUTCMonth() + 1).padStart(2, '0'),
      String(today.getUTCDate()).padStart(2, '0'),
    ].join('-');

    expect(component['form'].controls.occurredOn.value).toBe(expectedDate);
    expect(component['form'].controls.occurredOn.dirty).toBe(true);
    expect(component['form'].controls.occurredOn.touched).toBe(true);
  });

  it('focuses category search after opening the category dropdown and filters options', async () => {
    const fixture = TestBed.createComponent(TransactionCreateFormComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const dropdownButton = compiled.querySelector<HTMLButtonElement>(
      'app-category-select button[aria-haspopup="listbox"]'
    );
    dropdownButton?.click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const searchInput = compiled.querySelector<HTMLInputElement>(
      'app-category-select input[type="search"]'
    );
    if (!searchInput) {
      throw new Error('Category search input was not rendered.');
    }
    expect(document.activeElement).toBe(searchInput);

    searchInput.value = 'transport';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const listbox = compiled.querySelector(
      'app-category-select [role="listbox"]'
    ) as HTMLElement;
    expect(listbox.textContent).toContain('Transport');
    expect(listbox.textContent).not.toContain('Food');
  });

  it('uses the same focused searchable dropdown for transaction places', async () => {
    const fixture = TestBed.createComponent(TransactionCreateFormComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const dropdownButtons = compiled.querySelectorAll<HTMLButtonElement>(
      'button[aria-haspopup="listbox"]'
    );
    dropdownButtons[1]?.click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const searchInput = compiled.querySelector<HTMLInputElement>(
      'input[type="search"]'
    );
    if (!searchInput) {
      throw new Error('Place search input was not rendered.');
    }
    expect(document.activeElement).toBe(searchInput);

    searchInput.value = 'zebrzydowice';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const listbox = compiled.querySelector('[role="listbox"]') as HTMLElement;
    expect(listbox.textContent).toContain('Barber');

    compiled
      .querySelector<HTMLButtonElement>('[role="option"]:last-child')
      ?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance['form'].controls.placeId.value).toBe(
      'place-1'
    );
  });

  it('remembers create date and category after saving', async () => {
    const fixture = TestBed.createComponent(TransactionCreateFormComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component['form'].patchValue({
      categoryId: 'category-2',
      occurredOn: '2026-06-16',
      amount: '42',
      walletId: 'wallet-1',
    });

    await component['submit']();

    const stored = JSON.parse(
      sessionStorage.getItem(recentDefaultsStorageKey) ?? '{}'
    ) as { occurredOn?: string; categoryId?: string };
    expect(stored).toEqual({
      occurredOn: '2026-06-16',
      categoryId: 'category-2',
    });
  });

  it('saves and resets the form without closing when adding another transaction', async () => {
    const fixture = TestBed.createComponent(TransactionCreateFormComponent);
    const store = TestBed.inject(
      TransactionsStore
    ) as unknown as TransactionsStoreStub;
    fixture.detectChanges();

    const component = fixture.componentInstance;
    let closed = false;
    let saved = false;
    component.closed.subscribe(() => {
      closed = true;
    });
    component.saved.subscribe(() => {
      saved = true;
    });
    component['form'].patchValue({
      description: 'First transaction',
      categoryId: 'category-2',
      occurredOn: '2026-06-16',
      amount: '42',
      walletId: 'wallet-1',
    });

    await component['submitAndAddAnother']();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(store.createTransactionsCalls).toBe(1);
    expect(saved).toBe(true);
    expect(closed).toBe(false);
    expect(component['form'].controls.description.value).toBe('');
    expect(component['form'].controls.amount.value).toBe('');
    expect(component['form'].controls.occurredOn.value).toBe('2026-06-16');
    expect(component['form'].controls.categoryId.value).toBe('category-2');
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
      .querySelector<HTMLButtonElement>('section button.btn-outline.btn-sm')
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

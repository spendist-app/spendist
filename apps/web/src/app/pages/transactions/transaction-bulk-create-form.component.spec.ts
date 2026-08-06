import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideAppTransloco } from '../../i18n/transloco.providers';
import { TransactionBulkCreateFormComponent } from './transaction-bulk-create-form.component';
import {
  CreateTransactionBatchPayload,
  TransactionsStore,
} from './transactions.store';

class TransactionsStoreStub {
  readonly categories = signal([
    {
      id: 'category-food',
      ownerId: 'user-1',
      name: 'Food',
      color: null,
      icon: null,
      groupId: null,
      parentId: null,
    },
    {
      id: 'category-household',
      ownerId: 'user-1',
      name: 'Household',
      color: null,
      icon: null,
      groupId: null,
      parentId: null,
    },
  ]);
  readonly groupedCategories = signal([]);
  readonly ungroupedCategories = signal(this.categories());
  readonly tags = signal([
    {
      id: 'tag-meal',
      ownerId: 'user-1',
      name: 'meal',
      color: null,
      icon: null,
    },
  ]);
  readonly wallets = signal([
    {
      id: 'wallet-default',
      ownerId: 'user-1',
      name: 'Default Wallet',
      isDefault: true,
      currencyId: 1,
      currency: 'PLN',
    },
    {
      id: 'wallet-eur',
      ownerId: 'user-1',
      name: 'Euro Wallet',
      isDefault: false,
      currencyId: 2,
      currency: 'EUR',
    },
  ]);
  readonly places = signal([
    {
      id: 'place-barber',
      ownerId: 'user-1',
      name: 'Barber',
      street: null,
      city: null,
      postalCode: null,
      country: null,
      note: null,
    },
  ]);
  readonly currencies = signal([
    { id: 1, symbol: 'PLN' },
    { id: 2, symbol: 'EUR' },
  ]);
  readonly defaultCurrency = signal('PLN');
  readonly defaultWalletId = signal('wallet-default');
  readonly transactionMutationPending = signal(false);
  readonly mutationError = signal(null);
  createTransactionBatchPayload: CreateTransactionBatchPayload | null = null;

  dismissMutationError(): void {
    return;
  }

  async ensureTags(names: readonly string[]) {
    const existing = this.tags();
    const next = [
      ...existing,
      ...names
        .filter(
          (name) =>
            !existing.some(
              (tag) => tag.name.toLowerCase() === name.toLowerCase()
            )
        )
        .map((name) => ({
          id: `tag-${name.toLowerCase()}`,
          ownerId: 'user-1',
          name,
          color: null,
          icon: null,
        })),
    ];
    this.tags.set(next);
    return next;
  }

  async getExchangeRate(): Promise<number> {
    return 4;
  }

  async createTransactionBatch(payload: CreateTransactionBatchPayload) {
    this.createTransactionBatchPayload = payload;
    return {
      success: true,
      created: payload.transactions.length,
      duplicatesSkipped: 0,
    };
  }
}

describe('TransactionBulkCreateFormComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionBulkCreateFormComponent],
      providers: [
        {
          provide: TransactionsStore,
          useClass: TransactionsStoreStub,
        },
        ...provideAppTransloco(),
      ],
    }).compileComponents();
  });

  it('creates transactions from pasted rows and resolves new tags', async () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      onPaste(event: ClipboardEvent): void;
      submit(): Promise<void>;
    };
    const store = TestBed.inject(
      TransactionsStore
    ) as unknown as TransactionsStoreStub;
    const event = {
      clipboardData: {
        getData: () =>
          '2026-07-05\tLunch\t12,50\tPLN\texpense\tFood\tDefault Wallet\tmeal; newtag\tBarber',
      },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    component.onPaste(event);
    await component.submit();

    expect(store.createTransactionBatchPayload?.transactions).toHaveLength(1);
    expect(store.createTransactionBatchPayload?.transactions[0]).toMatchObject({
      description: 'Lunch',
      categoryId: 'category-food',
      amount: 12.5,
      currency: 'PLN',
      direction: 'expense',
      walletId: 'wallet-default',
      placeId: 'place-barber',
      tagIds: ['tag-meal', 'tag-newtag'],
    });
  });

  it('reuses the editor for an exact import draft and blocks unknown tags', () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.componentRef.setInput('prefill', {
      mode: 'import',
      walletId: 'wallet-default',
      direction: 'expense',
      duplicatesSkipped: 0,
      rows: [
        {
          occurredAt: new Date('2026-08-01T12:00:00.000Z'),
          description: 'Imported row',
          amount: 10,
          currency: 'PLN',
          categoryPath: ['Missing category'],
          categoryId: '',
          tags: ['missing-tag'],
          placeId: '',
          importContext: {
            source: 'spendist_csv',
            fingerprint: 'fingerprint-1',
            metadata: {},
            isAutomatic: false,
            recurringScheduledFor: null,
            sourceAmountInDefault: 10,
          },
        },
      ],
    });
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      rows(): readonly unknown[];
      validationIssues(): readonly { key: string }[];
    };

    expect(component.rows()).toHaveLength(1);
    expect(component.validationIssues().map((issue) => issue.key)).toEqual(
      expect.arrayContaining(['category', 'tags'])
    );
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="bulk-paste-table-toggle"]'
      )
    ).toBeNull();
  });

  it('captures paste events from anywhere while the modal is open', () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      rows(): readonly {
        readonly description: string;
        readonly amount: string;
      }[];
    };
    const event = new Event('paste', { bubbles: true });
    Object.defineProperty(event, 'clipboardData', {
      value: {
        getData: () =>
          '2026-07-10\tPasted from clipboard\t49.90\tPLN\tFood\tmeal\tBarber\t1',
      },
    });

    document.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.rows()[0]).toMatchObject({
      description: 'Pasted from clipboard',
      amount: '49.90',
    });
  });

  it('leaves pasted text in the focused field when table parsing is disabled', () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      rows(): readonly { readonly description: string }[];
      parseClipboardAsTable(): boolean;
      onPaste(event: ClipboardEvent): void;
    };
    const toggle = fixture.nativeElement.querySelector(
      '[data-testid="bulk-paste-table-toggle"]'
    ) as HTMLInputElement;
    const event = {
      clipboardData: {
        getData: () => 'Coffee, cake and tea',
      },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    expect(toggle.checked).toBe(true);
    toggle.click();
    fixture.detectChanges();
    component.onPaste(event);

    expect(component.parseClipboardAsTable()).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(component.rows()[0].description).toBe('');
  });

  it('blocks submit when an active row has an invalid amount', async () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      rows(): readonly { readonly id: number }[];
      updateRow(rowId: number, field: string, value: string): void;
      submit(): Promise<void>;
    };
    const store = TestBed.inject(
      TransactionsStore
    ) as unknown as TransactionsStoreStub;
    const firstRow = component.rows()[0];

    component.updateRow(firstRow.id, 'amount', 'abc');
    await component.submit();

    expect(store.createTransactionBatchPayload).toBeNull();
  });

  it('expands a row quantity and applies batch wallet and direction', async () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      rows(): readonly { readonly id: number }[];
      updateRow(rowId: number, field: string, value: string | number): void;
      updateBatchWallet(walletId: string): void;
      updateBatchDirection(direction: 'expense' | 'income'): void;
      submit(): Promise<void>;
    };
    const store = TestBed.inject(
      TransactionsStore
    ) as unknown as TransactionsStoreStub;
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    const firstRow = component.rows()[0];

    component.updateBatchWallet('wallet-eur');
    component.updateBatchDirection('income');
    component.updateRow(firstRow.id, 'description', 'Refund');
    component.updateRow(firstRow.id, 'amount', '12');
    component.updateRow(firstRow.id, 'quantity', 2);
    await component.submit();

    expect(store.createTransactionBatchPayload?.transactions).toHaveLength(2);
    expect(store.createTransactionBatchPayload?.transactions).toEqual([
      expect.objectContaining({
        description: 'Refund',
        currency: 'EUR',
        direction: 'income',
        walletId: 'wallet-eur',
      }),
      expect.objectContaining({
        description: 'Refund',
        currency: 'EUR',
        direction: 'income',
        walletId: 'wallet-eur',
      }),
    ]);
    expect(saved).toHaveBeenCalledWith(2);
  });

  it('accepts the upper quantity limit of 100', async () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      rows(): readonly { readonly id: number }[];
      updateRow(rowId: number, field: string, value: string | number): void;
      submit(): Promise<void>;
    };
    const store = TestBed.inject(
      TransactionsStore
    ) as unknown as TransactionsStoreStub;
    const firstRow = component.rows()[0];

    component.updateRow(firstRow.id, 'amount', '12');
    component.updateRow(firstRow.id, 'quantity', 100);
    await component.submit();

    expect(store.createTransactionBatchPayload?.transactions).toHaveLength(100);
  });

  it.each([0, -1, 1.5, 101])(
    'blocks submit for invalid quantity %s',
    async (quantity) => {
      const fixture = TestBed.createComponent(
        TransactionBulkCreateFormComponent
      );
      fixture.detectChanges();
      const component = fixture.componentInstance as unknown as {
        rows(): readonly { readonly id: number }[];
        updateRow(rowId: number, field: string, value: string | number): void;
        submit(): Promise<void>;
      };
      const store = TestBed.inject(
        TransactionsStore
      ) as unknown as TransactionsStoreStub;
      const firstRow = component.rows()[0];

      component.updateRow(firstRow.id, 'amount', '12');
      component.updateRow(firstRow.id, 'quantity', quantity);
      await component.submit();

      expect(store.createTransactionBatchPayload).toBeNull();
    }
  );

  it('copies shared fields in both directions without activating empty rows', () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      rows(): readonly {
        readonly id: number;
        readonly occurredOn: string;
        readonly currency: string;
        readonly categoryId: string;
        readonly tags: string;
        readonly placeId: string;
        readonly touched: boolean;
      }[];
      activeRows(): readonly unknown[];
      updateRow(rowId: number, field: string, value: string): void;
      copyField(
        rowId: number,
        field: 'occurredOn' | 'currency' | 'categoryId' | 'tags' | 'placeId',
        direction: 'up' | 'down'
      ): void;
    };
    const source = component.rows()[1];

    component.updateRow(source.id, 'occurredOn', '2026-07-10');
    component.updateRow(source.id, 'currency', 'EUR');
    component.updateRow(source.id, 'categoryId', 'category-household');
    component.updateRow(source.id, 'tags', 'home');
    component.updateRow(source.id, 'placeId', 'place-barber');
    component.copyField(source.id, 'categoryId', 'up');
    component.copyField(source.id, 'occurredOn', 'down');
    component.copyField(source.id, 'currency', 'down');
    component.copyField(source.id, 'tags', 'down');
    component.copyField(source.id, 'placeId', 'down');

    expect(component.rows()[0]).toMatchObject({
      categoryId: 'category-household',
      touched: false,
    });
    expect(component.rows()[2]).toMatchObject({
      occurredOn: '2026-07-10',
      currency: 'EUR',
      tags: 'home',
      placeId: 'place-barber',
      touched: false,
    });
    expect(component.activeRows()).toHaveLength(1);
  });

  it('closes the copy menu after applying an action', () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.detectChanges();
    const firstMenu = fixture.nativeElement.querySelector(
      'details'
    ) as HTMLDetailsElement;
    const copyBelow = firstMenu.querySelector(
      'ul li:last-child button'
    ) as HTMLButtonElement;

    firstMenu.open = true;
    copyBelow.click();
    fixture.detectChanges();

    expect(firstMenu.open).toBe(false);
  });

  it('accepts the new pasted column order with quantity', async () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      onPaste(event: ClipboardEvent): void;
      submit(): Promise<void>;
    };
    const store = TestBed.inject(
      TransactionsStore
    ) as unknown as TransactionsStoreStub;
    const event = {
      clipboardData: {
        getData: () =>
          '2026-07-05\tToilet paper\t12\tPLN\tHousehold\thome\tBarber\t2',
      },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    component.onPaste(event);
    await component.submit();

    expect(store.createTransactionBatchPayload?.transactions).toHaveLength(2);
    expect(store.createTransactionBatchPayload?.transactions[0]).toMatchObject({
      description: 'Toilet paper',
      categoryId: 'category-household',
      placeId: 'place-barber',
    });
  });
});

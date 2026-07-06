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
    return { success: true, created: payload.transactions.length };
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
});

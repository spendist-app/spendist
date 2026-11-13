import {
  requiredValue,
  fixtureElement,
  pasteEvent,
} from '../../../testing/dom';
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
      ...names.flatMap((name) =>
        existing.some((tag) => tag.name.toLowerCase() === name.toLowerCase())
          ? []
          : [
              {
                id: `tag-${name.toLowerCase()}`,
                ownerId: 'user-1',
                name,
                color: null,
                icon: null,
              },
            ]
      ),
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
        TransactionsStoreStub,
        { provide: TransactionsStore, useExisting: TransactionsStoreStub },
        ...provideAppTransloco(),
      ],
    }).compileComponents();
  });

  it('creates transactions from pasted rows and resolves new tags', async () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    const store = TestBed.inject(TransactionsStoreStub);

    const event = pasteEvent(
      '2026-07-05\tLunch\t12,50\tPLN\texpense\tFood\tDefault Wallet\tmeal; newtag\tBarber'
    );

    component['onPaste'](event);
    await component['submit']();

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
          categoryGroup: 'Missing group',
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

    const component = fixture.componentInstance;

    expect(component['rows']()).toHaveLength(1);
    expect(component['validationIssues']().map((issue) => issue.key)).toEqual(
      expect.arrayContaining(['category', 'tags'])
    );
    expect(
      fixtureElement(fixture).querySelector(
        '[data-testid="bulk-paste-table-toggle"]'
      )
    ).toBeNull();
  });

  it('captures paste events from anywhere while the modal is open', () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    const event = new Event('paste', { bubbles: true });
    Object.defineProperty(event, 'clipboardData', {
      value: {
        getData: () =>
          '2026-07-10\tPasted from clipboard\t49.90\tPLN\tFood\tmeal\tBarber\t1',
      },
    });

    document.dispatchEvent(event);
    fixture.detectChanges();

    expect(component['rows']()[0]).toMatchObject({
      description: 'Pasted from clipboard',
      amount: '49.90',
    });
  });

  it('leaves pasted text in the focused field when table parsing is disabled', () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    const toggle = requiredValue(
      fixtureElement(fixture).querySelector<HTMLInputElement>(
        '[data-testid="bulk-paste-table-toggle"]'
      )
    );

    const event = pasteEvent('Coffee, cake and tea');
    vi.spyOn(event, 'preventDefault');

    expect(toggle.checked).toBe(true);
    toggle.click();
    fixture.detectChanges();
    component['onPaste'](event);

    expect(component['parseClipboardAsTable']()).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(component['rows']()[0].description).toBe('');
  });

  it('blocks submit when an active row has an invalid amount', async () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    const store = TestBed.inject(TransactionsStoreStub);

    const firstRow = component['rows']()[0];

    component['updateRow'](firstRow.id, 'amount', 'abc');
    await component['submit']();

    expect(store.createTransactionBatchPayload).toBeNull();
  });

  it('expands a row quantity and applies batch wallet and direction', async () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    const store = TestBed.inject(TransactionsStoreStub);

    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);
    const firstRow = component['rows']()[0];

    component['updateBatchWallet']('wallet-eur');
    component['updateBatchDirection']('income');
    component['updateRow'](firstRow.id, 'description', 'Refund');
    component['updateRow'](firstRow.id, 'amount', '12');
    component['updateRow'](firstRow.id, 'quantity', 2);
    await component['submit']();

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

    const component = fixture.componentInstance;

    const store = TestBed.inject(TransactionsStoreStub);

    const firstRow = component['rows']()[0];

    component['updateRow'](firstRow.id, 'amount', '12');
    component['updateRow'](firstRow.id, 'quantity', 100);
    await component['submit']();

    expect(store.createTransactionBatchPayload?.transactions).toHaveLength(100);
  });

  it.each([0, -1, 1.5, 101])(
    'blocks submit for invalid quantity %s',
    async (quantity) => {
      const fixture = TestBed.createComponent(
        TransactionBulkCreateFormComponent
      );

      fixture.detectChanges();

      const component = fixture.componentInstance;

      const store = TestBed.inject(TransactionsStoreStub);

      const firstRow = component['rows']()[0];

      component['updateRow'](firstRow.id, 'amount', '12');
      component['updateRow'](firstRow.id, 'quantity', quantity);
      await component['submit']();

      expect(store.createTransactionBatchPayload).toBeNull();
    }
  );

  it('copies shared fields in both directions without activating empty rows', () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    const source = component['rows']()[1];

    component['updateRow'](source.id, 'occurredOn', '2026-07-10');
    component['updateRow'](source.id, 'currency', 'EUR');
    component['updateRow'](source.id, 'categoryId', 'category-household');
    component['updateRow'](source.id, 'tags', 'home');
    component['updateRow'](source.id, 'placeId', 'place-barber');
    component['copyField'](source.id, 'categoryId', 'up');
    component['copyField'](source.id, 'occurredOn', 'down');
    component['copyField'](source.id, 'currency', 'down');
    component['copyField'](source.id, 'tags', 'down');
    component['copyField'](source.id, 'placeId', 'down');

    expect(component['rows']()[0]).toMatchObject({
      categoryId: 'category-household',
      touched: false,
    });
    expect(component['rows']()[2]).toMatchObject({
      occurredOn: '2026-07-10',
      currency: 'EUR',
      tags: 'home',
      placeId: 'place-barber',
      touched: false,
    });
    expect(component['activeRows']()).toHaveLength(1);
  });

  it('copies a field down from the row copy menu popover', async () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);

    await fixture.whenStable();

    const component = fixture.componentInstance;
    const root = fixtureElement(fixture);
    const [first, second] = component['rows']();

    component['updateRow'](requiredValue(first).id, 'tags', 'home');
    await fixture.whenStable();

    // Copy menus per row: date, currency, category, tags, place.
    const tagsMenu = requiredValue(
      root.querySelectorAll<HTMLElement>('[role="menu"]')[3]
    );

    const trigger = requiredValue(
      root.querySelector<HTMLButtonElement>(`[commandfor="${tagsMenu.id}"]`)
    );

    expect(tagsMenu.getAttribute('popover')).toBe('auto');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');

    requiredValue(
      tagsMenu.querySelector<HTMLButtonElement>('li:last-child button')
    ).click();

    expect(
      component['rows']().find((row) => row.id === requiredValue(second).id)
        ?.tags
    ).toBe('home');
  });

  it('accepts the new pasted column order with quantity', async () => {
    const fixture = TestBed.createComponent(TransactionBulkCreateFormComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    const store = TestBed.inject(TransactionsStoreStub);

    const event = pasteEvent(
      '2026-07-05\tToilet paper\t12\tPLN\tHousehold\thome\tBarber\t2'
    );

    vi.spyOn(event, 'preventDefault');

    component['onPaste'](event);
    await component['submit']();

    expect(store.createTransactionBatchPayload?.transactions).toHaveLength(2);
    expect(store.createTransactionBatchPayload?.transactions[0]).toMatchObject({
      description: 'Toilet paper',
      categoryId: 'category-household',
      placeId: 'place-barber',
    });
  });

  describe('native dialog', () => {
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });

    const close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    });

    beforeEach(() => {
      showModal.mockClear();
      close.mockClear();

      // jsdom does not implement the modal dialog API.
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
        configurable: true,
        value: showModal,
      });

      Object.defineProperty(HTMLDialogElement.prototype, 'close', {
        configurable: true,
        value: close,
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
      Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    });

    function renderDialog() {
      const fixture = TestBed.createComponent(
        TransactionBulkCreateFormComponent
      );

      fixture.detectChanges();

      const dialog = requiredValue(
        fixtureElement(fixture).querySelector<HTMLDialogElement>('dialog')
      );

      return { fixture, dialog };
    }

    it('opens as a native modal named by the form title', async () => {
      const { fixture, dialog } = renderDialog();
      await fixture.whenStable();

      expect(showModal).toHaveBeenCalledTimes(1);
      expect(dialog.open).toBe(true);
      expect(dialog.getAttribute('aria-labelledby')).toBe(
        'transaction-bulk-form-title'
      );
      expect(dialog.querySelector('[role="dialog"]')).toBeNull();
      expect(dialog.querySelector('[aria-modal]')).toBeNull();
    });

    it('closes through the dialog close event and emits closed once', async () => {
      const { fixture, dialog } = renderDialog();
      await fixture.whenStable();

      let closedCount = 0;
      fixture.componentInstance['closed'].subscribe(() => {
        closedCount += 1;
      });

      fixture.componentInstance['onClose']();

      expect(close).toHaveBeenCalledTimes(1);
      expect(dialog.open).toBe(false);
      expect(closedCount).toBe(1);
    });

    it('emits closed when the browser closes the dialog after Esc', async () => {
      const { fixture, dialog } = renderDialog();
      await fixture.whenStable();

      let closedCount = 0;
      fixture.componentInstance['closed'].subscribe(() => {
        closedCount += 1;
      });

      const cancel = new Event('cancel', { cancelable: true });
      dialog.dispatchEvent(cancel);
      dialog.dispatchEvent(new Event('close'));

      expect(cancel.defaultPrevented).toBe(false);
      expect(closedCount).toBe(1);
    });

    it('closes the dialog once after a successful save', async () => {
      const { fixture, dialog } = renderDialog();
      await fixture.whenStable();

      const component = fixture.componentInstance;
      let closedCount = 0;
      let savedCount = 0;

      component['closed'].subscribe(() => {
        closedCount += 1;
      });

      component['saved'].subscribe(() => {
        savedCount += 1;
      });

      component['onPaste'](
        pasteEvent(
          '2026-07-05\tLunch\t12,50\tPLN\texpense\tFood\tDefault Wallet\tmeal\tBarber'
        )
      );
      await component['submit']();

      expect(savedCount).toBe(1);
      expect(close).toHaveBeenCalledTimes(1);
      expect(dialog.open).toBe(false);
      expect(closedCount).toBe(1);
    });
  });
});

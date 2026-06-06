import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAppTransloco } from '../../../i18n/transloco.providers';
import { RecurringPaymentFormComponent } from './recurring-payment-form.component';
import { RecurringPaymentsStore } from './recurring-payments.store';

class RecurringPaymentsStoreStub {
  readonly categories = signal([
    {
      id: 'food',
      name: 'Food',
      color: null,
      icon: null,
      groupId: 'expenses',
      parentId: null,
    },
    {
      id: 'groceries',
      name: 'Groceries',
      color: null,
      icon: null,
      groupId: 'expenses',
      parentId: 'food',
    },
    {
      id: 'biedronka',
      name: 'Biedronka',
      color: null,
      icon: null,
      groupId: 'expenses',
      parentId: 'groceries',
    },
    {
      id: 'salary',
      name: 'Salary',
      color: null,
      icon: null,
      groupId: 'income',
      parentId: null,
    },
    {
      id: 'misc',
      name: 'Misc',
      color: null,
      icon: null,
      groupId: null,
      parentId: null,
    },
  ]);
  readonly groupedCategories = signal([
    {
      id: 'expenses',
      name: 'Expenses',
      color: null,
      icon: null,
      categories: this.categories().filter((category) => category.groupId === 'expenses'),
    },
    {
      id: 'income',
      name: 'Income',
      color: null,
      icon: null,
      categories: this.categories().filter((category) => category.groupId === 'income'),
    },
  ]);
  readonly ungroupedCategories = signal(this.categories().filter((category) => !category.groupId));
  readonly tags = signal([]);
  readonly wallets = signal([
    {
      id: 'wallet-1',
      ownerId: 'owner-1',
      name: 'Main',
      isDefault: true,
      currencyId: 1,
      currency: 'PLN',
    },
  ]);
  readonly editingRecurring = signal(null);
  readonly isEditing = signal(false);
  readonly mutationPending = signal(false);
  readonly mutationError = signal(null);
  readonly defaultCurrency = signal('PLN');
  readonly defaultWalletId = signal('wallet-1');
  lastCreatePayload: unknown = null;

  async createRecurringTransaction(payload: unknown): Promise<void> {
    this.lastCreatePayload = payload;
  }

  async updateRecurringTransaction(_id: string, payload: unknown): Promise<void> {
    this.lastCreatePayload = payload;
  }
}

describe('RecurringPaymentFormComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecurringPaymentFormComponent],
      providers: [
        {
          provide: RecurringPaymentsStore,
          useClass: RecurringPaymentsStoreStub,
        },
        ...provideAppTransloco(),
      ],
    }).compileComponents();
  });

  it('groups categories like the transaction form', () => {
    const fixture = TestBed.createComponent(RecurringPaymentFormComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const groups = Array.from(compiled.querySelectorAll('#recurring-category optgroup'));
    const options = Array.from(compiled.querySelectorAll('#recurring-category option'));

    expect(groups.map((group) => group.getAttribute('label'))).toEqual(['Expenses', 'Income']);
    expect(options.some((option) => option.textContent?.trim() === 'Food / Groceries / Biedronka')).toBe(true);
    expect(options.some((option) => option.textContent?.trim() === 'Misc')).toBe(true);
  });

  it('builds cron from user-friendly schedule controls', () => {
    const fixture = TestBed.createComponent(RecurringPaymentFormComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.form.controls.schedule.value).toBe('0 12 1 * *');

    component.updateScheduleFrequency({
      target: { value: 'weekly' },
    } as unknown as Event);
    component.updateScheduleTime({
      target: { value: '09:30' },
    } as unknown as Event);
    component.updateScheduleDayOfWeek({
      target: { value: '5' },
    } as unknown as Event);

    expect(component.form.controls.schedule.value).toBe('30 9 * * 5');
  });

  it('submits historical fixed recurring payments', async () => {
    const fixture = TestBed.createComponent(RecurringPaymentFormComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const store = TestBed.inject(RecurringPaymentsStore) as unknown as RecurringPaymentsStoreStub;
    component.form.patchValue({
      name: 'Old rent',
      categoryId: 'food',
      amount: 1200,
      amountMode: 'fixed',
      walletId: 'wallet-1',
      startDate: '2023-01-01',
      endDate: '2024-12-31',
    });

    await component.onSubmit();

    expect(store.lastCreatePayload).toEqual(
      expect.objectContaining({
        amount: 1200,
        amountMode: 'fixed',
        startDate: '2023-01-01',
        endDate: '2024-12-31',
      }),
    );
  });

  it('submits variable recurring payments without a fixed amount', async () => {
    const fixture = TestBed.createComponent(RecurringPaymentFormComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const store = TestBed.inject(RecurringPaymentsStore) as unknown as RecurringPaymentsStoreStub;
    component.form.patchValue({
      name: 'Electricity',
      categoryId: 'food',
      amountMode: 'variable',
      walletId: 'wallet-1',
      startDate: '2023-01-01',
      endDate: '2024-12-31',
    });

    await component.onSubmit();

    expect(store.lastCreatePayload).toEqual(
      expect.objectContaining({
        amount: 0,
        amountMode: 'variable',
      }),
    );
  });
});

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
      categories: this.categories().filter(
        (category) => category.groupId === 'expenses'
      ),
    },
    {
      id: 'income',
      name: 'Income',
      color: null,
      icon: null,
      categories: this.categories().filter(
        (category) => category.groupId === 'income'
      ),
    },
  ]);
  readonly ungroupedCategories = signal(
    this.categories().filter((category) => !category.groupId)
  );
  readonly tags = signal<
    Array<{
      id: string;
      name: string;
      color: string | null;
      icon: string | null;
    }>
  >([]);
  readonly recurringTransactions = signal<
    Array<{
      startDate: Date;
      tags: Array<{
        id: string;
        name: string;
        color: string | null;
        icon: string | null;
      }>;
    }>
  >([]);
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
  readonly currencies = signal([
    { id: 1, symbol: 'PLN' },
    { id: 2, symbol: 'EUR' },
    { id: 3, symbol: 'USD' },
  ]);
  readonly editingRecurring = signal<unknown>(null);
  readonly isEditing = signal(false);
  readonly mutationPending = signal(false);
  readonly mutationError = signal(null);
  readonly defaultCurrency = signal('PLN');
  readonly defaultWalletId = signal('wallet-1');
  lastCreatePayload: unknown = null;
  lastUpdatePayload: unknown = null;

  async createRecurringTransaction(payload: unknown): Promise<void> {
    this.lastCreatePayload = payload;
  }

  async updateRecurringTransaction(
    _id: string,
    payload: unknown
  ): Promise<void> {
    this.lastUpdatePayload = payload;
  }

  async ensureTags(names: readonly string[]) {
    const created = names.map((name, index) => ({
      id: `created-${index}`,
      name,
      color: null,
      icon: null,
    }));
    this.tags.update((tags) => [...tags, ...created]);
    return created;
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

  it('uses the shared searchable category dropdown', async () => {
    const fixture = TestBed.createComponent(RecurringPaymentFormComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const dropdown = compiled.querySelector<HTMLButtonElement>(
      'app-category-select button[aria-haspopup="listbox"]'
    );
    dropdown?.click();
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

    searchInput.value = 'biedronka';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const listbox = compiled.querySelector(
      'app-category-select [role="listbox"]'
    ) as HTMLElement;
    expect(listbox.textContent).toContain('Food / Groceries / Biedronka');
    expect(listbox.textContent).not.toContain('Salary');

    const option = listbox.querySelector<HTMLButtonElement>(
      'button[role="option"]'
    );
    option?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.categoryId.value).toBe(
      'biedronka'
    );
  });

  it('uses the shared compact tag picker with seven recent tags', () => {
    const fixture = TestBed.createComponent(RecurringPaymentFormComponent);
    const store = TestBed.inject(
      RecurringPaymentsStore
    ) as unknown as RecurringPaymentsStoreStub;
    const tags = Array.from({ length: 8 }, (_, index) => ({
      id: `tag-${index + 1}`,
      name: `Tag ${index + 1}`,
      color: null,
      icon: null,
    }));
    store.tags.set(tags);
    store.recurringTransactions.set([
      {
        startDate: new Date(Date.UTC(2026, 6, 15)),
        tags,
      },
    ]);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('app-tag-picker')
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="recent-tag"]')
    ).toHaveLength(7);
    expect(
      fixture.nativeElement.querySelectorAll(
        'app-tag-picker input[type="checkbox"]'
      )
    ).toHaveLength(0);
  });

  it('builds cron from user-friendly schedule controls', () => {
    const fixture = TestBed.createComponent(RecurringPaymentFormComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.form.controls.schedule.value).toBe(
      monthlyCronForLocalTime(1, '12:00')
    );

    component.updateScheduleFrequency({
      target: { value: 'weekly' },
    } as unknown as Event);
    component.updateScheduleTime({
      target: { value: '09:30' },
    } as unknown as Event);
    component.updateScheduleDayOfWeek({
      target: { value: '5' },
    } as unknown as Event);

    expect(component.form.controls.schedule.value).toBe(
      weeklyCronForLocalTime(5, '09:30')
    );
  });

  it('keeps schedule state in sync when the frequency select changes in the DOM', () => {
    const fixture = TestBed.createComponent(RecurringPaymentFormComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;
    const frequency = compiled.querySelector(
      '#recurring-schedule-frequency'
    ) as HTMLSelectElement;

    frequency.value = 'daily';
    frequency.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    expect(component.form.controls.scheduleFrequency.value).toBe('daily');
    expect(component.form.controls.schedule.value).toBe(
      dailyCronForLocalTime('12:00')
    );
    expect(compiled.textContent).not.toContain('Day 1');
  });

  it('shows all application currencies in the amount selector', () => {
    const fixture = TestBed.createComponent(RecurringPaymentFormComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const currencySelect = compiled.querySelector(
      'select[formControlName="currency"]'
    ) as HTMLSelectElement;
    const options = Array.from(currencySelect?.options ?? []).map(
      (option) => option.value
    );

    expect(options).toEqual(['PLN', 'EUR', 'USD']);
  });

  it('submits historical fixed recurring payments', async () => {
    const fixture = TestBed.createComponent(RecurringPaymentFormComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const store = TestBed.inject(
      RecurringPaymentsStore
    ) as unknown as RecurringPaymentsStoreStub;
    component.form.patchValue({
      name: 'Old rent',
      categoryId: 'food',
      amount: 1200,
      currency: 'EUR',
      amountMode: 'fixed',
      walletId: 'wallet-1',
      startDate: '2023-01-01',
      endDate: '2024-12-31',
    });

    await component.onSubmit();

    expect(store.lastCreatePayload).toEqual(
      expect.objectContaining({
        amount: 1200,
        currency: 'EUR',
        amountMode: 'fixed',
        startDate: '2023-01-01',
        endDate: '2024-12-31',
      })
    );
  });

  it('submits variable recurring payments without a fixed amount', async () => {
    const fixture = TestBed.createComponent(RecurringPaymentFormComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const store = TestBed.inject(
      RecurringPaymentsStore
    ) as unknown as RecurringPaymentsStoreStub;
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
      })
    );
  });

  it('updates edited recurring payments after schedule and date changes', async () => {
    const fixture = TestBed.createComponent(RecurringPaymentFormComponent);
    const store = TestBed.inject(
      RecurringPaymentsStore
    ) as unknown as RecurringPaymentsStoreStub;
    store.isEditing.set(true);
    store.editingRecurring.set({
      id: 'recurring-1',
      ownerId: 'owner-1',
      name: 'Chatgpt',
      categoryId: 'food',
      amount: 123,
      amountMode: 'fixed',
      walletId: 'wallet-1',
      direction: 'expense',
      startDate: new Date('2026-06-10T00:00:00.000Z'),
      endDate: null,
      schedule: monthlyCronForLocalTime(1, '12:00'),
      tags: [],
      currency: 'USD',
      exchangeRate: null,
      category: null,
      walletName: 'Main',
      isPaused: false,
      pausedAt: null,
    });
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.updateScheduleFrequency({
      target: { value: 'daily' },
    } as unknown as Event);
    component.updateScheduleTime({
      target: { value: '12:30' },
    } as unknown as Event);
    component.form.controls.startDate.setValue('2026-06-10');

    await component.onSubmit();

    expect(store.lastUpdatePayload).toEqual(
      expect.objectContaining({
        name: 'Chatgpt',
        currency: 'USD',
        startDate: '2026-06-10',
        schedule: dailyCronForLocalTime('12:30'),
      })
    );
  });

  it('shows validation feedback instead of making save inert', async () => {
    const fixture = TestBed.createComponent(RecurringPaymentFormComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const store = TestBed.inject(
      RecurringPaymentsStore
    ) as unknown as RecurringPaymentsStoreStub;
    component.form.controls.name.setValue('');
    await component.onSubmit();

    expect(store.lastCreatePayload).toBeNull();
    expect(component.submissionError()).toBe(
      'modules.recurringPayments.form.notifications.invalid'
    );
  });
});

function dailyCronForLocalTime(time: string): string {
  const { hour, minute } = utcPartsForLocalTime(time);
  return `${minute} ${hour} * * *`;
}

function weeklyCronForLocalTime(dayOfWeek: number, time: string): string {
  const { hour, minute, utcDayOfWeek } = utcPartsForLocalTime(time, dayOfWeek);
  return `${minute} ${hour} * * ${utcDayOfWeek}`;
}

function monthlyCronForLocalTime(dayOfMonth: number, time: string): string {
  const { hour, minute, utcDayOfMonth } = utcPartsForLocalTime(
    time,
    undefined,
    dayOfMonth
  );
  return `${minute} ${hour} ${utcDayOfMonth} * *`;
}

function utcPartsForLocalTime(
  time: string,
  dayOfWeek?: number,
  dayOfMonth?: number
): {
  readonly hour: number;
  readonly minute: number;
  readonly utcDayOfWeek: number;
  readonly utcDayOfMonth: number;
} {
  const [hour, minute] = time.split(':').map(Number);
  const now = new Date();
  let date: Date;

  if (dayOfWeek !== undefined) {
    const daysUntilTarget = (dayOfWeek - now.getDay() + 7) % 7;
    date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysUntilTarget,
      hour,
      minute,
      0,
      0
    );
  } else if (dayOfMonth !== undefined) {
    date = new Date(
      now.getFullYear(),
      now.getMonth(),
      dayOfMonth,
      hour,
      minute,
      0,
      0
    );
  } else {
    date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
      0,
      0
    );
  }

  return {
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    utcDayOfWeek: date.getUTCDay(),
    utcDayOfMonth: date.getUTCDate(),
  };
}

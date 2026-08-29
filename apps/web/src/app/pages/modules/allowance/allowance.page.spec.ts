import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@ngneat/transloco';
import { firstValueFrom } from 'rxjs';
import { afterEach, vi } from 'vitest';
import { provideAppTransloco } from '../../../i18n/transloco.providers';
import { TransactionsStore } from '../../transactions/transactions.store';
import {
  AllowanceRecipientExpense,
  AllowanceService,
} from './allowance.service';
import { AllowancePageComponent } from './allowance.page';

const recipientExpense: AllowanceRecipientExpense = {
  transactionId: 'transaction-1',
  connectionId: 'connection-1',
  recipientName: 'Ada',
  occurredAt: new Date('2026-08-19T00:00:00.000Z'),
  description: 'Ice cream',
  amount: 12.5,
  currency: 'PLN',
  createdAt: new Date('2026-08-19T10:00:00.000Z'),
  updatedAt: new Date('2026-08-19T10:00:00.000Z'),
};

class AllowanceServiceStub {
  readonly connections = signal([
    {
      id: 'connection-1',
      role: 'payer' as const,
      counterpartId: 'child-1',
      counterpartName: 'Ada',
      counterpartEmail: 'ada@example.test',
      status: 'active' as const,
      connectedAt: new Date('2026-08-01T00:00:00.000Z'),
    },
  ]);
  readonly activePayerConnections = signal(this.connections());
  readonly invitations = signal([]);
  readonly schedules = signal([]);
  readonly recipientExpenses = signal([recipientExpense]);
  readonly error = signal<string | null>(null);
  readonly pending = signal(false);
  updateCall: { id: string; payload: unknown } | null = null;
  deleteCall: string | null = null;

  async load(): Promise<void> {
    return;
  }

  async updateRecipientExpense(id: string, payload: unknown): Promise<boolean> {
    this.updateCall = { id, payload };
    return true;
  }

  async deleteRecipientExpense(id: string): Promise<boolean> {
    this.deleteCall = id;
    return true;
  }
}

class TransactionsStoreStub {
  readonly categories = signal([
    { id: 'category-1', name: 'Allowance', groupId: null },
  ]);
  readonly wallets = signal([
    { id: 'wallet-1', name: 'Main', currency: 'PLN', isDefault: true },
  ]);
  readonly defaultWalletId = signal('wallet-1');
}

describe('AllowancePageComponent recipient expenses', () => {
  let allowance: AllowanceServiceStub;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    allowance = new AllowanceServiceStub();
    await TestBed.configureTestingModule({
      imports: [AllowancePageComponent],
      providers: provideAppTransloco(),
    })
      .overrideComponent(AllowancePageComponent, {
        set: {
          providers: [
            { provide: AllowanceService, useValue: allowance },
            { provide: TransactionsStore, useClass: TransactionsStoreStub },
          ],
        },
      })
      .compileComponents();

    await firstValueFrom(
      TestBed.inject(TranslocoService).selectTranslate(
        'modules.allowance.recipientExpenses.deleteConfirm'
      )
    );
  });

  it('renders and updates a delegated child expense', async () => {
    const fixture = TestBed.createComponent(AllowancePageComponent);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="recipient-expense-card"]'
      )
    ).not.toBeNull();

    fixture.componentInstance.beginRecipientExpenseEdit(recipientExpense);
    fixture.componentInstance.recipientExpenseForm.patchValue({
      description: 'Ice cream corrected',
      occurredOn: '2026-08-20',
      amount: 15,
      currency: 'PLN',
    });
    await fixture.componentInstance.saveRecipientExpense();

    expect(allowance.updateCall).toMatchObject({
      id: 'transaction-1',
      payload: {
        description: 'Ice cream corrected',
        amount: 15,
        currency: 'PLN',
      },
    });
  });

  it('requires confirmation before deleting a delegated child expense', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fixture = TestBed.createComponent(AllowancePageComponent);
    fixture.detectChanges();

    await fixture.componentInstance.deleteRecipientExpense(recipientExpense);

    expect(allowance.deleteCall).toBe('transaction-1');
  });
});

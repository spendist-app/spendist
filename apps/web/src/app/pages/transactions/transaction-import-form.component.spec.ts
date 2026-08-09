import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { provideAppTransloco } from '../../i18n/transloco.providers';
import { TransactionImportFormComponent } from './transaction-import-form.component';
import { TransactionsStore } from './transactions.store';

const CSV = [
  'id,occurred_at,description,direction,amount,currency,amount_in_default,category_group,category_path,category,wallet,wallet_currency,tags,is_automatic,recurring_scheduled_for,import_source,imported_at',
  'source-1,2026-08-01T12:00:00.000Z,Groceries,expense,12.50,PLN,12.50,Home,Food,Food,Main wallet,PLN,,false,,,',
].join('\n');

class TransactionsStoreStub {
  readonly wallets = signal([
    { id: 'wallet-1', name: 'Main wallet', currency: 'PLN' },
  ]);
  readonly categories = signal([
    {
      id: 'category-1',
      name: 'Food',
      groupId: 'group-1',
      parentId: null,
    },
  ]);
  readonly groups = signal([{ id: 'group-1', name: 'Home' }]);
  readonly places = signal([]);
  readonly defaultWalletId = signal('wallet-1');
}

interface ImportFormHarness {
  sourceMode(): 'file' | 'paste';
  pastedCsv(): string;
  parsed(): { rows: readonly unknown[] } | null;
  errorKey(): string | null;
  canContinue(): boolean;
  selectSourceMode(mode: 'file' | 'paste'): void;
  onPastedCsvChange(value: string): void;
}

describe('TransactionImportFormComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionImportFormComponent],
      providers: [
        provideAppTransloco(),
        { provide: TransactionsStore, useClass: TransactionsStoreStub },
      ],
    }).compileComponents();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('validates pasted Spendist CSV automatically', async () => {
    const fixture = TestBed.createComponent(TransactionImportFormComponent);
    const component = fixture.componentInstance as unknown as ImportFormHarness;
    component.selectSourceMode('paste');

    component.onPastedCsvChange(CSV);
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    expect(component.parsed()?.rows).toHaveLength(1);
    expect(component.errorKey()).toBeNull();
    expect(component.canContinue()).toBe(true);
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-import-review"]'
      ).disabled
    ).toBe(false);
  });

  it('shows a CSV validation error without exposing the review action', async () => {
    const fixture = TestBed.createComponent(TransactionImportFormComponent);
    const component = fixture.componentInstance as unknown as ImportFormHarness;
    component.selectSourceMode('paste');

    component.onPastedCsvChange('occurred_at,direction,amount\ninvalid');
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    expect(component.parsed()).toBeNull();
    expect(component.errorKey()).toBe(
      'transactions.import.errors.invalid_file'
    );
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-import-review"]'
      )
    ).toBeNull();
  });

  it('clears source and validation when switching input methods', async () => {
    const fixture = TestBed.createComponent(TransactionImportFormComponent);
    const component = fixture.componentInstance as unknown as ImportFormHarness;
    component.selectSourceMode('paste');
    component.onPastedCsvChange(CSV);
    await vi.advanceTimersByTimeAsync(300);

    component.selectSourceMode('file');

    expect(component.sourceMode()).toBe('file');
    expect(component.pastedCsv()).toBe('');
    expect(component.parsed()).toBeNull();
    expect(component.errorKey()).toBeNull();
  });
});

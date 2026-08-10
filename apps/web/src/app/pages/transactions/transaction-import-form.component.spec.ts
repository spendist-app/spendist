import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageService } from '../../core/language.service';
import type { LanguageCode } from '../../i18n/languages';
import { provideAppTransloco } from '../../i18n/transloco.providers';
import { TransactionImportFormComponent } from './transaction-import-form.component';
import { TransactionsStore } from './transactions.store';

const CSV = [
  'id,occurred_at,description,direction,amount,currency,amount_in_default,category_group,category_path,category,wallet,wallet_currency,tags,is_automatic,recurring_scheduled_for,import_source,imported_at',
  'source-1,2026-08-01T12:00:00.000Z,Groceries,expense,12.50,PLN,12.50,Home,Food,Food,Main wallet,PLN,,false,,,',
].join('\n');

class TransactionsStoreStub {
  readonly wallets = signal([
    {
      id: 'wallet-1',
      name: 'Main wallet',
      currency: 'PLN',
      isDefault: true,
    },
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
  readonly tags = signal([{ id: 'tag-1', name: 'weekly' }]);
  readonly places = signal([]);
  readonly defaultWalletId = signal('wallet-1');
}

class LanguageServiceStub {
  readonly currentLanguage = signal<LanguageCode>('en');
}

interface ImportFormHarness {
  sourceMode(): 'file' | 'paste';
  pastedCsv(): string;
  parsed(): { rows: readonly unknown[] } | null;
  errorKey(): string | null;
  canContinue(): boolean;
  aiPromptOpen(): boolean;
  aiPromptCopied(): boolean;
  aiPrompt(): string;
  selectSourceMode(mode: 'file' | 'paste'): void;
  onPastedCsvChange(value: string): void;
  openAiPrompt(): void;
  copyAiPrompt(): Promise<void>;
  continueToReview(): void;
}

describe('TransactionImportFormComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionImportFormComponent],
      providers: [
        provideAppTransloco(),
        { provide: TransactionsStore, useClass: TransactionsStoreStub },
        { provide: LanguageService, useClass: LanguageServiceStub },
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

  it('prepares and copies an AI prompt with user catalogs', async () => {
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      'clipboard'
    );
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const fixture = TestBed.createComponent(TransactionImportFormComponent);
    const component = fixture.componentInstance as unknown as ImportFormHarness;
    component.selectSourceMode('paste');
    component.openAiPrompt();
    fixture.detectChanges();

    expect(component.aiPromptOpen()).toBe(true);
    expect(component.aiPrompt()).toContain('"wallet": "Main wallet"');
    expect(component.aiPrompt()).toContain('"category_group": "Home"');
    expect(component.aiPrompt()).toContain('"weekly"');
    expect(component.aiPrompt()).not.toContain('wallet-1');
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-import-ai-prompt"]'
      ).value
    ).toBe(component.aiPrompt());

    await component.copyAiPrompt();

    expect(writeText).toHaveBeenCalledWith(component.aiPrompt());
    expect(component.aiPromptCopied()).toBe(true);
    if (clipboardDescriptor) {
      Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('disables AI prompt preparation without a wallet', () => {
    const store = TestBed.inject(
      TransactionsStore
    ) as unknown as TransactionsStoreStub;
    store.wallets.set([]);
    const fixture = TestBed.createComponent(TransactionImportFormComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-testid="transaction-import-ai-prompt-open"]'
    ) as HTMLButtonElement | null;
    expect(button).toBeNull();

    const component = fixture.componentInstance as unknown as ImportFormHarness;
    component.selectSourceMode('paste');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="transaction-import-ai-prompt-open"]'
      ).disabled
    ).toBe(true);
  });

  it('uses the CSV group to disambiguate duplicate category names', async () => {
    const store = TestBed.inject(
      TransactionsStore
    ) as unknown as TransactionsStoreStub;
    store.groups.set([
      { id: 'group-1', name: 'Home' },
      { id: 'group-2', name: 'Work' },
    ]);
    store.categories.set([
      {
        id: 'category-home',
        name: 'Food',
        groupId: 'group-1',
        parentId: null,
      },
      {
        id: 'category-work',
        name: 'Food',
        groupId: 'group-2',
        parentId: null,
      },
    ]);
    const fixture = TestBed.createComponent(TransactionImportFormComponent);
    const component = fixture.componentInstance as unknown as ImportFormHarness;
    let preparedCategoryId = '';
    fixture.componentInstance.prepared.subscribe((prefill) => {
      preparedCategoryId = prefill.rows[0]?.categoryId ?? '';
    });
    component.selectSourceMode('paste');
    component.onPastedCsvChange(CSV);
    await vi.advanceTimersByTimeAsync(300);

    component.continueToReview();

    expect(preparedCategoryId).toBe('category-home');
  });
});

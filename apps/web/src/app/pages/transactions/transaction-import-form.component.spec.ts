import { requiredValue, fixtureElement } from '../../../testing/dom';
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

describe('TransactionImportFormComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionImportFormComponent],
      providers: [
        provideAppTransloco(),
        TransactionsStoreStub,
        { provide: TransactionsStore, useExisting: TransactionsStoreStub },
        LanguageServiceStub,
        { provide: LanguageService, useExisting: LanguageServiceStub },
      ],
    }).compileComponents();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('validates pasted Spendist CSV automatically', async () => {
    const fixture = TestBed.createComponent(TransactionImportFormComponent);
    const component = fixture.componentInstance;
    component['selectSourceMode']('paste');

    component['onPastedCsvChange'](CSV);
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    expect(component['parsed']()?.rows).toHaveLength(1);
    expect(component['errorKey']()).toBeNull();
    expect(component['canContinue']()).toBe(true);
    expect(
      requiredValue(
        fixtureElement(fixture).querySelector<HTMLButtonElement>(
          '[data-testid="transaction-import-review"]'
        )
      ).disabled
    ).toBe(false);
  });

  it('shows a CSV validation error without exposing the review action', async () => {
    const fixture = TestBed.createComponent(TransactionImportFormComponent);
    const component = fixture.componentInstance;
    component['selectSourceMode']('paste');

    component['onPastedCsvChange']('occurred_at,direction,amount\ninvalid');
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    expect(component['parsed']()).toBeNull();
    expect(component['errorKey']()).toBe(
      'transactions.import.errors.invalid_file'
    );
    expect(
      fixtureElement(fixture).querySelector(
        '[data-testid="transaction-import-review"]'
      )
    ).toBeNull();
  });

  it('clears source and validation when switching input methods', async () => {
    const fixture = TestBed.createComponent(TransactionImportFormComponent);
    const component = fixture.componentInstance;
    component['selectSourceMode']('paste');
    component['onPastedCsvChange'](CSV);
    await vi.advanceTimersByTimeAsync(300);

    component['selectSourceMode']('file');

    expect(component['sourceMode']()).toBe('file');
    expect(component['pastedCsv']()).toBe('');
    expect(component['parsed']()).toBeNull();
    expect(component['errorKey']()).toBeNull();
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
    const component = fixture.componentInstance;
    component['selectSourceMode']('paste');
    component['openAiPrompt']();
    fixture.detectChanges();

    expect(component['aiPromptOpen']()).toBe(true);
    expect(component['aiPrompt']()).toContain('"wallet": "Main wallet"');
    expect(component['aiPrompt']()).toContain('"category_group": "Home"');
    expect(component['aiPrompt']()).toContain('"weekly"');
    expect(component['aiPrompt']()).not.toContain('wallet-1');
    expect(
      requiredValue(
        fixtureElement(fixture).querySelector<HTMLTextAreaElement>(
          '[data-testid="transaction-import-ai-prompt"]'
        )
      ).value
    ).toBe(component['aiPrompt']());

    await component['copyAiPrompt']();

    expect(writeText).toHaveBeenCalledWith(component['aiPrompt']());
    expect(component['aiPromptCopied']()).toBe(true);

    if (clipboardDescriptor) {
      Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('disables AI prompt preparation without a wallet', () => {
    const store = TestBed.inject(TransactionsStoreStub);

    store.wallets.set([]);
    const fixture = TestBed.createComponent(TransactionImportFormComponent);
    fixture.detectChanges();

    const button = fixtureElement(fixture).querySelector<HTMLButtonElement>(
      '[data-testid="transaction-import-ai-prompt-open"]'
    );

    expect(button).toBeNull();

    const component = fixture.componentInstance;
    component['selectSourceMode']('paste');
    fixture.detectChanges();
    expect(
      requiredValue(
        fixtureElement(fixture).querySelector<HTMLButtonElement>(
          '[data-testid="transaction-import-ai-prompt-open"]'
        )
      ).disabled
    ).toBe(true);
  });

  it('uses the CSV group to disambiguate duplicate category names', async () => {
    const store = TestBed.inject(TransactionsStoreStub);

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
    const component = fixture.componentInstance;
    let preparedCategoryId = '';
    fixture.componentInstance.prepared.subscribe((prefill) => {
      preparedCategoryId = prefill.rows[0]?.categoryId ?? '';
    });
    component['selectSourceMode']('paste');
    component['onPastedCsvChange'](CSV);
    await vi.advanceTimersByTimeAsync(300);

    component['continueToReview']();

    expect(preparedCategoryId).toBe('category-home');
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

    function renderDialogs() {
      const fixture = TestBed.createComponent(TransactionImportFormComponent);
      fixture.detectChanges();

      const element = fixtureElement(fixture);

      const dialogFor = (titleId: string) =>
        requiredValue(
          element.querySelector<HTMLDialogElement>(
            `dialog[aria-labelledby="${titleId}"]`
          )
        );

      return {
        fixture,
        component: fixture.componentInstance,
        importDialog: dialogFor('transaction-import-title'),
        schemaDialog: dialogFor('csv-schema-title'),
        aiPromptDialog: dialogFor('ai-prompt-title'),
      };
    }

    it('opens the import form as a native modal named by its title', () => {
      const { importDialog, schemaDialog, aiPromptDialog, fixture } =
        renderDialogs();

      expect(showModal).toHaveBeenCalledTimes(1);
      expect(importDialog.open).toBe(true);
      expect(schemaDialog.open).toBe(false);
      expect(aiPromptDialog.open).toBe(false);
      expect(
        fixtureElement(fixture).querySelector('[role="dialog"], [aria-modal]')
      ).toBeNull();
    });

    it('closes through the dialog close event and emits closed once', () => {
      const { component, importDialog } = renderDialogs();

      let closedCount = 0;
      component['closed'].subscribe(() => {
        closedCount += 1;
      });

      component['onClose']();

      expect(close).toHaveBeenCalledTimes(1);
      expect(importDialog.open).toBe(false);
      expect(closedCount).toBe(1);
    });

    it('stacks the schema dialog and closes it without closing the import form', () => {
      const { fixture, component, importDialog, schemaDialog } =
        renderDialogs();

      let closedCount = 0;
      component['closed'].subscribe(() => {
        closedCount += 1;
      });

      component['selectSourceMode']('paste');
      fixture.detectChanges();

      requiredValue(
        importDialog.querySelector<HTMLButtonElement>(
          '[data-testid="csv-schema-help"]'
        )
      ).click();
      fixture.detectChanges();

      expect(schemaDialog.open).toBe(true);
      expect(showModal).toHaveBeenCalledTimes(2);

      requiredValue(
        schemaDialog.querySelector<HTMLButtonElement>(
          '[data-testid="csv-schema-close"]'
        )
      ).click();
      fixture.detectChanges();

      expect(schemaDialog.open).toBe(false);
      expect(component['schemaOpen']()).toBe(false);
      expect(importDialog.open).toBe(true);
      expect(closedCount).toBe(0);
    });

    it('closes the AI prompt on Esc without closing the import form', () => {
      const { fixture, component, importDialog, aiPromptDialog } =
        renderDialogs();

      let closedCount = 0;
      component['closed'].subscribe(() => {
        closedCount += 1;
      });

      component['selectSourceMode']('paste');
      component['openAiPrompt']();
      fixture.detectChanges();

      expect(aiPromptDialog.open).toBe(true);

      // The browser closes only the topmost modal on Esc.
      aiPromptDialog.removeAttribute('open');
      aiPromptDialog.dispatchEvent(new Event('close'));
      fixture.detectChanges();

      expect(component['aiPromptOpen']()).toBe(false);
      expect(importDialog.open).toBe(true);
      expect(closedCount).toBe(0);
    });
  });
});

import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fixtureElement, requiredValue } from '../../../testing/dom';
import { AuthService } from '../../core/auth.service';
import { provideAppTransloco } from '../../i18n/transloco.providers';
import { ConnectedAppsCard } from './connected-apps-card';
import { EmailPreferences } from './email-preferences';
import { KontomierzImportStore } from './kontomierz-import.store';
import { SettingsPageComponent } from './settings.page';
import {
  SettingsStore,
  type CategoryEntity,
  type CategoryGroupEntity,
} from './settings.store';
import { SpendistCsvTransferStore } from './spendist-csv-transfer.store';
import { TurnstileWidget } from '../../shared/captcha/turnstile-widget';

class SettingsStoreStub {
  readonly profile = signal(null);
  readonly groups = signal<CategoryGroupEntity[]>([
    {
      id: 'group-1',
      ownerId: 'user-1',
      name: 'Basics',
      color: '#0EA5A5',
      icon: null,
    },
  ]);

  readonly categories = signal<CategoryEntity[]>([]);
  readonly wallets = signal([]);
  readonly currencies = signal([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly walletError = signal<string | null>(null);
  readonly profileError = signal<string | null>(null);
  readonly categoryMutationPending = signal(false);
  readonly groupMutationPending = signal(false);
  readonly walletMutationPending = signal(false);
  readonly profileMutationPending = signal(false);

  clearError(): void {
    this.error.set(null);
  }

  clearWalletError(): void {
    this.walletError.set(null);
  }

  clearProfileError(): void {
    this.profileError.set(null);
  }
}

describe('SettingsPageComponent editor dialog', () => {
  const showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });

  const close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });

  beforeEach(async () => {
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

    TestBed.overrideComponent(SettingsPageComponent, {
      remove: { imports: [EmailPreferences, ConnectedAppsCard, TurnstileWidget] },
      add: { schemas: [NO_ERRORS_SCHEMA] },
    });

    TestBed.overrideProvider(SettingsStore, {
      useFactory: () => new SettingsStoreStub(),
    });

    TestBed.overrideProvider(KontomierzImportStore, { useValue: {} });
    TestBed.overrideProvider(SpendistCsvTransferStore, { useValue: {} });

    await TestBed.configureTestingModule({
      imports: [SettingsPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: {} },
        ...provideAppTransloco(),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });

  async function openGroupEditor() {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    const component = fixture.componentInstance;

    component['activePanel'].set('categoryGroups');
    fixture.detectChanges();

    component['openGroupCreator']();
    fixture.detectChanges();
    await fixture.whenStable();

    const dialog = requiredValue(
      fixtureElement(fixture).querySelector<HTMLDialogElement>('dialog')
    );

    return { fixture, component, dialog };
  }

  it('opens the editor as a native modal without manual dialog attributes', async () => {
    const { dialog } = await openGroupEditor();

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(true);
    expect(dialog.hasAttribute('aria-label')).toBe(true);
    expect(dialog.querySelector('[role="dialog"]')).toBeNull();
    expect(dialog.querySelector('[aria-modal]')).toBeNull();
  });

  it('closes the dialog before leaving the editor', async () => {
    const { fixture, component, dialog } = await openGroupEditor();

    component['closeEditor']();
    fixture.detectChanges();

    expect(close).toHaveBeenCalledTimes(1);
    expect(component['groupEditorMode']()).toBeNull();
    expect(dialog.isConnected).toBe(false);
  });

  it('closes on Esc through the same path as the close button', async () => {
    const { fixture, component, dialog } = await openGroupEditor();

    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    fixture.detectChanges();

    expect(cancel.defaultPrevented).toBe(true);
    expect(close).toHaveBeenCalledTimes(1);
    expect(component['groupEditorMode']()).toBeNull();
  });

  it('closes an open icon picker on Esc before the editor', async () => {
    const { fixture, component, dialog } = await openGroupEditor();

    component['iconPickerOpen'].set(true);

    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();

    expect(component['iconPickerOpen']()).toBe(false);
    expect(component['groupEditorMode']()).toBe('create');
    expect(close).not.toHaveBeenCalled();
  });

  it('keeps unsaved changes open when the user declines to discard them', async () => {
    const { fixture, component, dialog } = await openGroupEditor();

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component['categoryGroupForm'].controls.name.setValue('Draft');
    component['categoryGroupForm'].markAsDirty();

    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    expect(component['groupEditorMode']()).toBe('create');
  });

  it('reopens the dialog if the browser closes it while the user keeps a draft', async () => {
    const { fixture, component, dialog } = await openGroupEditor();

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component['categoryGroupForm'].markAsDirty();

    dialog.removeAttribute('open');
    dialog.dispatchEvent(new Event('close'));
    fixture.detectChanges();

    expect(component['groupEditorMode']()).toBe('create');
    expect(dialog.open).toBe(true);
    expect(showModal).toHaveBeenCalledTimes(2);
  });
});

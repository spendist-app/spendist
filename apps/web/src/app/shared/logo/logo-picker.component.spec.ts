import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@ngneat/transloco';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { SUPABASE_CLIENT } from '../../core/supabase';
import { provideAppTransloco } from '../../i18n/transloco.providers';
import { requiredValue } from '../../../testing/dom';
import { LogoCatalogService } from './logo-catalog.service';
import { LogoPickerComponent } from './logo-picker.component';
import { LogoService } from './logo.service';
import { type LogoDraft, catalogKey } from './logo';

const netflix = {
  source: 'simple-icons' as const,
  slug: 'netflix',
  hex: 'e50914',
  title: 'Netflix',
  value: 'simple-icons:netflix:e50914',
  keys: [catalogKey('Netflix')],
};

const biedronka = {
  source: 'dashboard-icons' as const,
  slug: 'biedronka',
  title: 'Biedronka',
  imageUrl: 'https://cdn.example/webp/biedronka.webp',
  keys: [catalogKey('biedronka')],
};

const pending = {
  blob: new Blob(['webp'], { type: 'image/webp' }),
  previewUrl: 'blob:preview',
};

async function render(initialQuery: string) {
  const catalog = {
    loadSimpleIcons: vi.fn(async () => [netflix]),
    loadDashboardIcons: vi.fn(async () => [biedronka]),
    downloadDashboardIcon: vi.fn(
      async () => new Blob(['png'], { type: 'image/png' })
    ),
  };

  const logos = {
    prepareFile: vi.fn(async () => pending),
    imageUrl: vi.fn(() => null),
  };

  await TestBed.configureTestingModule({
    imports: [LogoPickerComponent],
    providers: [
      provideAppTransloco(),
      { provide: AuthService, useValue: { session: signal(null) } },
      { provide: SUPABASE_CLIENT, useValue: {} },
      { provide: LogoCatalogService, useValue: catalog },
      { provide: LogoService, useValue: logos },
    ],
  }).compileComponents();

  await firstValueFrom(TestBed.inject(TranslocoService).load('en'));

  const fixture = TestBed.createComponent(LogoPickerComponent);
  fixture.componentRef.setInput('initialQuery', initialQuery);
  const picked: LogoDraft[] = [];
  fixture.componentInstance.picked.subscribe((draft) => picked.push(draft));
  await fixture.whenStable();

  const element: HTMLElement = fixture.nativeElement;

  return { fixture, element, catalog, logos, picked };
}

describe('LogoPickerComponent', () => {
  // jsdom has no modal dialog support.
  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      }),
    });

    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      }),
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });

  it('searches bundled icons with the record name and picks one', async () => {
    const { element, picked, catalog } = await render('NETFLIX ');

    expect(
      element.querySelector<HTMLInputElement>('[data-testid="logo-search"]')
        ?.value
    ).toBe('NETFLIX ');

    requiredValue(
      element.querySelector<HTMLButtonElement>('[data-slug="netflix"]')
    ).click();

    expect(picked).toEqual([
      { value: 'simple-icons:netflix:e50914', pending: null },
    ]);
    expect(catalog.loadDashboardIcons).not.toHaveBeenCalled();
  });

  it('contacts jsDelivr only after the user asks for more logos', async () => {
    const { fixture, element, catalog, logos, picked } = await render(
      'biedronka'
    );

    expect(
      element.querySelector('[data-testid="logo-dashboard-icon"]')
    ).toBeNull();

    requiredValue(
      element.querySelector<HTMLButtonElement>(
        '[data-testid="logo-dashboard-icons-load"]'
      )
    ).click();
    await fixture.whenStable();

    requiredValue(
      element.querySelector<HTMLButtonElement>(
        '[data-testid="logo-dashboard-icon"][data-slug="biedronka"]'
      )
    ).click();
    await fixture.whenStable();

    expect(catalog.downloadDashboardIcon).toHaveBeenCalledWith(biedronka);
    expect(logos.prepareFile).toHaveBeenCalledTimes(1);
    expect(picked).toEqual([{ value: null, pending }]);
  });

  it('prepares an uploaded image and reports a rejected one', async () => {
    const { fixture, element, logos, picked } = await render('');

    const input = requiredValue(
      element.querySelector<HTMLInputElement>('[data-testid="logo-upload"]')
    );

    const select = (file: File) => {
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: { item: () => file, length: 1 },
      });
      input.dispatchEvent(new Event('change'));
    };

    logos.prepareFile.mockRejectedValueOnce(
      new Error('logos.errors.unsupportedType')
    );
    select(new File(['gif'], 'logo.gif', { type: 'image/gif' }));
    await fixture.whenStable();

    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Choose a PNG, JPEG or WebP image.'
    );
    expect(picked).toEqual([]);

    select(new File(['png'], 'logo.png', { type: 'image/png' }));
    await fixture.whenStable();

    expect(picked).toEqual([{ value: null, pending }]);
  });

  it('keeps Enter in the search field from submitting the surrounding form', async () => {
    const { element } = await render('netflix');

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
    });

    requiredValue(
      element.querySelector<HTMLInputElement>('[data-testid="logo-search"]')
    ).dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});

import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

const STORAGE_KEY = 'spendist-theme';

function mockSystemScheme(dark: boolean) {
  const listeners: ((event: { matches: boolean }) => void)[] = [];

  const query = {
    matches: dark,
    addEventListener: (_type: string, listener: (typeof listeners)[number]) =>
      listeners.push(listener),
  };

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => query),
  });

  return {
    change(nextDark: boolean) {
      query.matches = nextDark;

      for (const listener of listeners) listener({ matches: nextDark });
    },
  };
}

function htmlTheme(): string | null {
  return document.documentElement.getAttribute('data-theme');
}

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.innerHTML =
      '<meta name="color-scheme" content="light dark">' +
      '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">' +
      '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#161a1d">';
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('follows system scheme changes while no theme is saved', () => {
    const system = mockSystemScheme(false);
    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('spendistLight');
    expect(service.followsSystem()).toBe(true);

    system.change(true);

    expect(service.theme()).toBe('spendistDark');
    expect(htmlTheme()).toBe('spendistDark');
  });

  it('saves only an override and returns to the system on toggle back', () => {
    mockSystemScheme(false);
    const service = TestBed.inject(ThemeService);

    service.toggleTheme();

    expect(service.theme()).toBe('spendistDark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('spendistDark');
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
        ?.content
    ).toBe('dark');

    service.toggleTheme();

    expect(service.theme()).toBe('spendistLight');
    expect(service.followsSystem()).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
        ?.content
    ).toBe('light dark');
  });

  it('keeps a saved theme when the system later matches it', () => {
    const system = mockSystemScheme(false);
    const service = TestBed.inject(ThemeService);

    service.toggleTheme();
    system.change(true);
    system.change(false);

    expect(service.theme()).toBe('spendistDark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('spendistDark');
    expect(
      Array.from(
        document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
        (meta) => meta.content
      )
    ).toEqual(['#161a1d', '#161a1d']);
  });

  it('picks up a theme saved in another tab', () => {
    mockSystemScheme(false);
    const service = TestBed.inject(ThemeService);

    localStorage.setItem(STORAGE_KEY, 'spendistDark');
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));

    expect(service.theme()).toBe('spendistDark');
  });
});

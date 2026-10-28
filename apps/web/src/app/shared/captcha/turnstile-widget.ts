import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { readEnv } from '../../config/read-env';

const TURNSTILE_SCRIPT =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileOptions {
  readonly sitekey: string;
  readonly language: 'auto';
  readonly theme: 'auto';
  readonly callback: (token: string) => void;
  readonly 'expired-callback': () => void;
  readonly 'error-callback': () => void;
}

interface TurnstileApi {
  render(element: HTMLElement, options: TurnstileOptions): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptLoad: Promise<TurnstileApi> | null = null;

// Without a configured site key (local development, E2E, self-hosting without
// captcha) no widget is shown and no captcha token is sent.
export function turnstileSiteKey(): string | null {
  return readEnv(['NG_APP_TURNSTILE_SITE_KEY']) || null;
}

function loadTurnstile(document: Document): Promise<TurnstileApi> {
  scriptLoad ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT;
    script.async = true;

    script.onload = () =>
      document.defaultView?.turnstile
        ? resolve(document.defaultView.turnstile)
        : reject(new Error('Turnstile unavailable'));

    script.onerror = () => {
      scriptLoad = null;
      reject(new Error('Turnstile unavailable'));
    };

    document.head.appendChild(script);
  });

  return scriptLoad;
}

// Cloudflare Turnstile check for Supabase Auth requests. Each token is
// single-use: call reset() after every request that consumed one.
@Component({
  standalone: true,
  selector: 'app-turnstile-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #container class="flex min-h-[65px] justify-center"></div>`,
})
export class TurnstileWidget implements OnDestroy {
  readonly token = output<string | null>();

  private readonly container =
    viewChild.required<ElementRef<HTMLElement>>('container');

  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private api: TurnstileApi | null = null;
  private widgetId: string | null = null;

  constructor() {
    afterNextRender(() => void this.render());
  }

  reset(): void {
    this.token.emit(null);

    if (this.api && this.widgetId) {
      this.api.reset(this.widgetId);
    }
  }

  ngOnDestroy(): void {
    if (this.api && this.widgetId) {
      this.api.remove(this.widgetId);
    }
  }

  private async render(): Promise<void> {
    const sitekey = turnstileSiteKey();

    if (!this.browser || !sitekey) {
      return;
    }

    try {
      this.api = await loadTurnstile(this.document);
    } catch {
      return;
    }

    this.widgetId = this.api.render(this.container().nativeElement, {
      sitekey,
      language: 'auto',
      theme: 'auto',
      callback: (token) => this.token.emit(token),
      'expired-callback': () => this.token.emit(null),
      'error-callback': () => this.token.emit(null),
    });
  }
}

// Per-form captcha state: a form may submit once a token exists, or at any time
// when no site key is configured.
export class CaptchaState {
  readonly required = turnstileSiteKey() !== null;
  readonly token = signal<string | null>(null);
  readonly ready = computed(() => !this.required || this.token() !== null);
}

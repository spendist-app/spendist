import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { AuthService } from '../../core/auth.service';
import { safeAuthReturnUrl } from '../../core/auth-return-url';
import { GlobalNoticeService } from '../../core/global-notice.service';
import { AccountSwitchPrompt } from '../../shared/account-switch/account-switch-prompt';

@Component({
  standalone: true,
  selector: 'app-auth-confirm-page',
  imports: [AccountSwitchPrompt, RouterLink, TranslocoPipe],
  templateUrl: './auth-confirm.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthConfirmPageComponent {
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly notices = inject(GlobalNoticeService);

  readonly failed = signal(false);
  readonly switchFrom = signal<string | null>(null);

  private callbackUrl = '';
  private destination = '/dashboard';

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.confirm();
    }
  }

  private async confirm(): Promise<void> {
    const window = this.document.defaultView;

    if (!window) {
      return;
    }

    this.callbackUrl = window.location.href;

    this.destination = safeAuthReturnUrl(
      new URL(this.callbackUrl).searchParams.get('returnUrl')
    );

    window.history.replaceState(null, '', '/auth/confirm');

    const signedInAs = await this.auth.accountSwitchFromUrl(this.callbackUrl);

    if (signedInAs !== null) {
      this.switchFrom.set(signedInAs);

      return;
    }

    await this.apply();
  }

  async continueSwitch(): Promise<void> {
    this.switchFrom.set(null);
    await this.auth.signOutLocally();
    await this.apply();
  }

  async cancelSwitch(): Promise<void> {
    await this.router.navigateByUrl('/dashboard');
  }

  private async apply(): Promise<void> {
    const result = await this.auth.confirmEmailFromUrl(this.callbackUrl);

    if (result.error) {
      this.failed.set(true);

      return;
    }

    this.notices.showSuccess('auth.confirm.success');
    await this.router.navigateByUrl(this.destination);
  }
}

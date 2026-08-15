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

@Component({
  standalone: true,
  selector: 'app-auth-confirm-page',
  imports: [RouterLink, TranslocoPipe],
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

    const callbackUrl = window.location.href;
    const parsedUrl = new URL(callbackUrl);
    const destination = safeAuthReturnUrl(
      parsedUrl.searchParams.get('returnUrl')
    );

    window.history.replaceState(null, '', '/auth/confirm');

    const result = await this.auth.confirmEmailFromUrl(callbackUrl);
    if (result.error) {
      this.failed.set(true);
      return;
    }

    this.notices.showSuccess('auth.confirm.success');
    await this.router.navigateByUrl(destination);
  }
}

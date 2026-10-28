import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { safeAuthReturnUrl } from '../../core/auth-return-url';
import { AuthService } from '../../core/auth.service';
import {
  CaptchaState,
  TurnstileWidget,
} from '../../shared/captcha/turnstile-widget';

@Component({
  standalone: true,
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, TranslocoPipe, TurnstileWidget],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.page.html',
})
export class LoginPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.formBuilder.group({
    email: this.formBuilder.control('', {
      validators: [Validators.required, Validators.email],
    }),
    password: this.formBuilder.control('', {
      validators: [Validators.required],
    }),
  });

  readonly controls = this.form.controls;
  readonly submitting = signal(false);
  readonly captcha = new CaptchaState();
  private readonly captchaWidget = viewChild(TurnstileWidget);
  readonly errorMessage = signal<string | null>(null);
  readonly passwordResetSuccess = signal(
    this.route.snapshot.queryParamMap.get('passwordReset') === 'success'
  );
  private readonly returnUrl = safeAuthReturnUrl(
    this.route.snapshot.queryParamMap.get('returnUrl')
  );

  async login(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    if (this.form.invalid || !this.captcha.ready()) {
      this.form.markAllAsTouched();

      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.passwordResetSuccess.set(false);

    try {
      const { email, password } = this.form.getRawValue();

      const result = await this.auth.signInWithPassword({
        email,
        password,
        captchaToken: this.captcha.token(),
      });

      this.captchaWidget()?.reset();

      if (result.error) {
        this.errorMessage.set(result.error);

        return;
      }

      await this.router.navigateByUrl(this.returnUrl);
    } finally {
      this.submitting.set(false);
    }
  }
}

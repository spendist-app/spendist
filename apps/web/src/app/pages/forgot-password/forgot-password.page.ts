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
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { AuthService } from '../../core/auth.service';
import {
  CaptchaState,
  TurnstileWidget,
} from '../../shared/captcha/turnstile-widget';

@Component({
  standalone: true,
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, TranslocoPipe, TurnstileWidget],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forgot-password.page.html',
})
export class ForgotPasswordPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);

  readonly form = this.formBuilder.group({
    email: this.formBuilder.control('', {
      validators: [Validators.required, Validators.email],
    }),
  });

  readonly controls = this.form.controls;
  readonly submitting = signal(false);
  readonly captcha = new CaptchaState();
  private readonly captchaWidget = viewChild(TurnstileWidget);
  readonly submitted = signal(false);
  readonly errorMessage = signal<string | null>(null);

  async requestReset(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    if (this.form.invalid || !this.captcha.ready()) {
      this.form.markAllAsTouched();

      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const { email } = this.form.getRawValue();

      const result = await this.auth.requestPasswordReset(
        email.trim(),
        this.captcha.token()
      );

      this.captchaWidget()?.reset();

      if (result.error) {
        this.errorMessage.set(result.error);

        return;
      }

      this.submitted.set(true);
      this.form.markAsPristine();
      this.form.markAsUntouched();
    } finally {
      this.submitting.set(false);
    }
  }
}

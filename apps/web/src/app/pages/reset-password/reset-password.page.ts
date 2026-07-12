import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { AuthService } from '../../core/auth.service';

const passwordsMatchValidator = (passwordKey: string, confirmPasswordKey: string) => {
  return (group: { get: (key: string) => { value: string } | null }) => {
    const password = group.get(passwordKey)?.value ?? '';
    const confirmPassword = group.get(confirmPasswordKey)?.value ?? '';
    if (!password || !confirmPassword) {
      return null;
    }
    return password !== confirmPassword ? { passwordsMismatch: true } : null;
  };
};

function buildPasswordValidators(): ValidatorFn[] {
  return [
    Validators.required,
    Validators.minLength(8),
    Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
  ];
}

@Component({
  standalone: true,
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reset-password.page.html',
})
export class ResetPasswordPageComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  readonly form = this.formBuilder.group(
    {
      password: this.formBuilder.control('', {
        validators: buildPasswordValidators(),
      }),
      confirmPassword: this.formBuilder.control('', {
        validators: [Validators.required],
      }),
    },
    { validators: [passwordsMatchValidator('password', 'confirmPassword')] }
  );

  readonly controls = this.form.controls;
  readonly checkingSession = signal(true);
  readonly recoveryReady = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly passwordsDoNotMatch = computed(
    () =>
      this.form.hasError('passwordsMismatch') &&
      (this.controls.confirmPassword.dirty || this.controls.confirmPassword.touched)
  );

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      this.checkingSession.set(false);
      return;
    }

    const result = await this.auth.establishPasswordRecoverySession(window.location.href);

    if (result.error) {
      this.errorMessage.set(result.error);
      this.recoveryReady.set(false);
    } else {
      this.recoveryReady.set(true);
      window.history.replaceState({}, document.title, '/reset-password');
    }

    this.checkingSession.set(false);
  }

  async resetPassword(): Promise<void> {
    if (this.submitting() || !this.recoveryReady()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.controls.confirmPassword.markAsDirty();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const { password } = this.form.getRawValue();
      const result = await this.auth.updatePassword(password);

      if (result.error) {
        this.errorMessage.set(result.error);
        return;
      }

      await this.auth.signOut();
      await this.router.navigate(['/login'], {
        queryParams: { passwordReset: 'success' },
      });
    } finally {
      this.submitting.set(false);
    }
  }
}

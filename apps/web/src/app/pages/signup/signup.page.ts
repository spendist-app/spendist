import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { DEFAULT_LANGUAGE as FALLBACK_LANGUAGE } from '../../i18n/languages';

const DEFAULT_CURRENCY_ID = 1;

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

function buildAvatarUrl(username: string): string {
  const seed = encodeURIComponent(username.trim().toLowerCase());
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
}

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}

function createUsernameFromName(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');

  if (normalized.length >= 3) {
    return normalized;
  }

  const timestamp = Math.random().toString(36).slice(2, 6);
  return `user_${timestamp}`;
}

@Component({
  standalone: true,
  selector: 'app-signup-page',
  imports: [ReactiveFormsModule, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './signup.page.html',
})
export class SignupPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);

  readonly form = this.formBuilder.group(
    {
      name: this.formBuilder.control('', {
        validators: [Validators.required, Validators.minLength(2)],
      }),
      email: this.formBuilder.control('', {
        validators: [Validators.required, Validators.email],
      }),
      password: this.formBuilder.control('', {
        validators: [Validators.required, Validators.minLength(8)],
      }),
      confirmPassword: this.formBuilder.control('', {
        validators: [Validators.required],
      }),
    },
    { validators: [passwordsMatchValidator('password', 'confirmPassword')] }
  );

  readonly controls = this.form.controls;
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly passwordsDoNotMatch = computed(
    () =>
      this.form.hasError('passwordsMismatch') &&
      (this.controls.confirmPassword.dirty || this.controls.confirmPassword.touched)
  );

  async register(): Promise<void> {
    if (this.submitting()) {
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
      const { name, email, password } = this.form.getRawValue();
      const safeName = name.trim();
      const username = createUsernameFromName(safeName);
      const language = this.languageService.currentLanguage() ?? FALLBACK_LANGUAGE;

      const result = await this.auth.signUp({
        email,
        password,
        username,
        fullName: safeName,
        timezone: detectTimezone(),
        language,
        defaultCurrencyId: DEFAULT_CURRENCY_ID,
        avatarUrl: buildAvatarUrl(username),
      });

      if (result.error) {
        this.errorMessage.set(result.error);
        return;
      }

      await this.router.navigateByUrl('/dashboard');
    } finally {
      this.submitting.set(false);
    }
  }
}

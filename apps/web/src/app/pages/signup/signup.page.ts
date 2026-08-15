import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { AuthService } from '../../core/auth.service';
import { safeAuthReturnUrl } from '../../core/auth-return-url';
import { LanguageService } from '../../core/language.service';
import { DEFAULT_LANGUAGE as FALLBACK_LANGUAGE } from '../../i18n/languages';
import {
  SUPPORTED_CURRENCIES,
  detectPreferredCurrencyId,
} from '../../core/currencies';

const passwordsMatchValidator = (
  passwordKey: string,
  confirmPasswordKey: string
) => {
  return (group: { get: (key: string) => { value: string } | null }) => {
    const password = group.get(passwordKey)?.value ?? '';
    const confirmPassword = group.get(confirmPasswordKey)?.value ?? '';
    if (!password || !confirmPassword) {
      return null;
    }
    return password !== confirmPassword ? { passwordsMismatch: true } : null;
  };
};

const isDev = typeof ngDevMode !== 'undefined' && !!ngDevMode;

function buildPasswordValidators(): ValidatorFn[] {
  const base: ValidatorFn[] = [Validators.required, Validators.minLength(8)];
  if (!isDev) {
    // Production: require at least one lowercase, one uppercase and one digit.
    base.push(Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/));
  }
  return base;
}

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

function detectLocales(): readonly string[] {
  if (typeof navigator === 'undefined') {
    return [];
  }

  if (navigator.languages.length > 0) {
    return navigator.languages;
  }

  return navigator.language ? [navigator.language] : [];
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
  private readonly route = inject(ActivatedRoute);
  private readonly languageService = inject(LanguageService);
  private readonly initialLanguage =
    this.languageService.currentLanguage() ?? FALLBACK_LANGUAGE;
  private readonly initialCurrencyId = detectPreferredCurrencyId(
    this.initialLanguage,
    detectLocales()
  );
  private readonly returnUrl = safeAuthReturnUrl(
    this.route.snapshot.queryParamMap.get('returnUrl')
  );

  readonly form = this.formBuilder.group(
    {
      name: this.formBuilder.control('', {
        validators: [Validators.required, Validators.minLength(2)],
      }),
      email: this.formBuilder.control('', {
        validators: [Validators.required, Validators.email],
      }),
      password: this.formBuilder.control('', {
        validators: buildPasswordValidators(),
      }),
      confirmPassword: this.formBuilder.control('', {
        validators: [Validators.required],
      }),
      defaultCurrencyId: this.formBuilder.control(this.initialCurrencyId, {
        validators: [Validators.required],
      }),
    },
    { validators: [passwordsMatchValidator('password', 'confirmPassword')] }
  );

  readonly currencies = SUPPORTED_CURRENCIES;
  readonly controls = this.form.controls;
  readonly submitting = signal(false);
  readonly pendingEmail = signal<string | null>(null);
  readonly resending = signal(false);
  readonly resendStatus = signal<'success' | 'error' | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly passwordsDoNotMatch = computed(
    () =>
      this.form.hasError('passwordsMismatch') &&
      (this.controls.confirmPassword.dirty ||
        this.controls.confirmPassword.touched)
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
      const { name, email, password, defaultCurrencyId } =
        this.form.getRawValue();
      const safeName = name.trim();
      const username = createUsernameFromName(safeName);
      const language =
        this.languageService.currentLanguage() ?? FALLBACK_LANGUAGE;
      const numericCurrencyId = Number(defaultCurrencyId);

      const normalizedEmail = email.trim();
      const result = await this.auth.signUp(
        {
          email: normalizedEmail,
          password,
          username,
          fullName: safeName,
          timezone: detectTimezone(),
          language,
          defaultCurrencyId: Number.isFinite(numericCurrencyId)
            ? numericCurrencyId
            : this.initialCurrencyId,
          avatarUrl: buildAvatarUrl(username),
        },
        this.returnUrl
      );

      if (result.error) {
        this.errorMessage.set(result.error);
        return;
      }

      if (result.confirmationRequired) {
        this.pendingEmail.set(normalizedEmail);
        return;
      }

      await this.router.navigateByUrl(this.returnUrl);
    } finally {
      this.submitting.set(false);
    }
  }

  async resendConfirmation(): Promise<void> {
    const email = this.pendingEmail();
    if (!email || this.resending()) {
      return;
    }

    this.resending.set(true);
    this.resendStatus.set(null);
    try {
      const result = await this.auth.resendSignupConfirmation(
        email,
        this.returnUrl
      );
      this.resendStatus.set(result.error ? 'error' : 'success');
    } finally {
      this.resending.set(false);
    }
  }
}

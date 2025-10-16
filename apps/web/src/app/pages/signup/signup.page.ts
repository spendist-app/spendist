import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

const DEFAULT_LANGUAGE = 'en';
const DEFAULT_CURRENCY = 'PLN';

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
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div class="w-full max-w-md space-y-8 rounded-2xl bg-base-100/70 p-8 shadow-xl backdrop-blur">
        <header class="space-y-2 text-center">
          <h1 class="text-3xl font-semibold leading-tight">Create your account</h1>
          <p class="text-base-content/70">
            Already have an account?
            <a class="link link-primary" routerLink="/login">Log in</a>
          </p>
        </header>

        @if (errorMessage()) {
          <p class="alert alert-error text-sm" role="alert" aria-live="assertive">
            {{ errorMessage() }}
          </p>
        }

        <form class="space-y-6" [formGroup]="form" (ngSubmit)="register()">
          <fieldset class="grid gap-4">
            <div class="form-control">
              <label class="label" for="name">
                <span class="label-text text-sm font-medium">Name</span>
              </label>
              <input
                id="name"
                type="text"
                formControlName="name"
                class="input input-bordered w-full"
                autocomplete="name"
                required
              />
              @if (controls.name.touched && controls.name.invalid) {
                <span class="label-text-alt text-error">Please enter your name (min. 2 characters).</span>
              }
            </div>

            <div class="form-control">
              <label class="label" for="email">
                <span class="label-text text-sm font-medium">Email</span>
              </label>
              <input
                id="email"
                type="email"
                formControlName="email"
                class="input input-bordered w-full"
                autocomplete="email"
                required
              />
              @if (controls.email.touched && controls.email.invalid) {
                <span class="label-text-alt text-error">Enter a valid email address.</span>
              }
            </div>

            <div class="form-control">
              <label class="label" for="password">
                <span class="label-text text-sm font-medium">Password</span>
              </label>
              <input
                id="password"
                type="password"
                formControlName="password"
                class="input input-bordered w-full"
                autocomplete="new-password"
                required
              />
              @if (controls.password.touched && controls.password.invalid) {
                <span class="label-text-alt text-error">
                  Use at least 8 characters including letters and numbers.
                </span>
              }
            </div>

            <div class="form-control">
              <label class="label" for="confirmPassword">
                <span class="label-text text-sm font-medium">Confirm password</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                formControlName="confirmPassword"
                class="input input-bordered w-full"
                autocomplete="new-password"
                required
              />
              @if (passwordsDoNotMatch()) {
                <span class="label-text-alt text-error">
                  Passwords must match.
                </span>
              }
            </div>
          </fieldset>

          <button
            class="btn btn-primary w-full"
            type="submit"
            [disabled]="submitting()"
          >
            @if (submitting()) {
              <span class="loading loading-spinner loading-sm"></span>
              Creating account...
            } @else {
              Sign up
            }
          </button>
        </form>

        <p class="text-xs text-base-content/60 text-center">
          By continuing you agree to our future Terms of Service and Privacy Policy.
        </p>
      </div>
    </section>
  `,
})
export class SignupPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

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

      const result = await this.auth.signUp({
        email,
        password,
        username,
        fullName: safeName,
        timezone: detectTimezone(),
        language: DEFAULT_LANGUAGE,
        defaultCurrency: DEFAULT_CURRENCY,
        avatarUrl: buildAvatarUrl(username),
      });

      if (result.error) {
        this.errorMessage.set(result.error);
        return;
      }

      await this.router.navigateByUrl('/home');
    } finally {
      this.submitting.set(false);
    }
  }
}

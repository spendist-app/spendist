import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div class="w-full max-w-md space-y-8 rounded-2xl bg-base-100/70 p-8 shadow-xl backdrop-blur">
        <header class="space-y-2 text-center">
          <h1 class="text-3xl font-semibold leading-tight">
            {{ 'auth.login.title' | transloco }}
          </h1>
          <p class="text-base-content/70">
            {{ 'auth.login.subtitle' | transloco }}
            <a class="link link-primary" routerLink="/signup">
              {{ 'auth.login.signupLink' | transloco }}
            </a>
          </p>
        </header>

        @if (errorMessage()) {
          <p class="alert alert-error text-sm" role="alert" aria-live="assertive">
            {{ errorMessage() }}
          </p>
        }

        <form class="space-y-6" [formGroup]="form" (ngSubmit)="login()">
          <fieldset class="grid gap-4">
            <div class="form-control">
              <label class="label" for="email">
                <span class="label-text text-sm font-medium">
                  {{ 'auth.login.emailLabel' | transloco }}
                </span>
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
                <span class="label-text-alt text-error">
                  {{ 'auth.login.emailError' | transloco }}
                </span>
              }
            </div>

            <div class="form-control">
              <label class="label" for="password">
                <span class="label-text text-sm font-medium">
                  {{ 'auth.login.passwordLabel' | transloco }}
                </span>
              </label>
              <input
                id="password"
                type="password"
                formControlName="password"
                class="input input-bordered w-full"
                autocomplete="current-password"
                required
              />
              @if (controls.password.touched && controls.password.invalid) {
                <span class="label-text-alt text-error">
                  {{ 'auth.login.passwordError' | transloco }}
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
              {{ 'auth.login.submitBusy' | transloco }}
            } @else {
              {{ 'auth.login.submitIdle' | transloco }}
            }
          </button>
        </form>
      </div>
    </section>
  `,
})
export class LoginPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

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
  readonly errorMessage = signal<string | null>(null);

  async login(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const { email, password } = this.form.getRawValue();
      const result = await this.auth.signInWithPassword({ email, password });

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

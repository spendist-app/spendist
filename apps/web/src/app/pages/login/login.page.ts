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
  templateUrl: './login.page.html',
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

import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-landing-page',
  imports: [RouterLink],
  template: `
    <section class="flex flex-col items-center justify-center gap-6 py-24 text-center">
      @if (auth.loading()) {
        <span class="loading loading-spinner loading-lg text-primary" aria-label="Checking session"></span>
      } @else {
        <ng-container>
          <h1 class="text-4xl font-bold tracking-tight md:text-5xl">
            Welcome to Spendist
          </h1>
          <p class="max-w-xl text-base-content/80 md:text-lg">
            Sign in to start tracking your spending, or create an account to get started.
          </p>
          <div class="flex flex-wrap justify-center gap-3">
            <a class="btn btn-outline" routerLink="/login">Log in</a>
            <a class="btn btn-primary" routerLink="/signup">Sign up</a>
          </div>
        </ng-container>
      }
    </section>
  `,
})
export class LandingPageComponent {
  readonly auth = inject(AuthService);
}

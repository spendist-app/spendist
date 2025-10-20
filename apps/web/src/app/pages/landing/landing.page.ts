import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-landing-page',
  imports: [RouterLink, TranslocoPipe],
  template: `
    <section class="flex flex-col items-center justify-center gap-6 py-24 text-center">
      @if (auth.loading()) {
        <span
          class="loading loading-spinner loading-lg text-primary"
          [attr.aria-label]="'common.status.checkingSession' | transloco"
        ></span>
      } @else {
        <ng-container>
          <h1 class="text-4xl font-bold tracking-tight md:text-5xl">
            {{ 'landing.title' | transloco }}
          </h1>
          <p class="max-w-xl text-base-content/80 md:text-lg">
            {{ 'landing.subtitle' | transloco }}
          </p>
          <div class="flex flex-wrap justify-center gap-3">
            <a class="btn btn-outline" routerLink="/login">{{ 'landing.loginCta' | transloco }}</a>
            <a class="btn btn-primary" routerLink="/signup">{{ 'landing.signupCta' | transloco }}</a>
          </div>
        </ng-container>
      }
    </section>
  `,
})
export class LandingPageComponent {
  readonly auth = inject(AuthService);
}

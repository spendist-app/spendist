import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-home-page',
  template: `
    <section class="flex flex-col items-center justify-center gap-4 py-24 text-center">
      @if (auth.loading()) {
        <span class="loading loading-spinner loading-lg text-primary" aria-label="Checking session"></span>
      } @else {
        <ng-container>
          <h1 class="text-3xl font-semibold md:text-4xl">Your dashboard will live here soon.</h1>
          <p class="text-base-content/70 md:text-lg">Stay tuned while we build out the experience.</p>
        </ng-container>
      }
    </section>
  `,
})
export class HomePageComponent {
  readonly auth = inject(AuthService);
}

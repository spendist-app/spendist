import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { TranslocoPipe } from '@ngneat/transloco';
import { AuthService } from '../../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-home-page',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="flex flex-col items-center justify-center gap-4 py-24 text-center">
      @if (auth.loading()) {
        <span
          class="loading loading-spinner loading-lg text-primary"
          [attr.aria-label]="'common.status.checkingSession' | transloco"
        ></span>
      } @else {
        <ng-container>
          <h1 class="text-3xl font-semibold md:text-4xl">{{ 'home.title' | transloco }}</h1>
          <p class="text-base-content/70 md:text-lg">{{ 'home.subtitle' | transloco }}</p>
        </ng-container>
      }
    </section>
  `,
})
export class HomePageComponent {
  readonly auth = inject(AuthService);
}

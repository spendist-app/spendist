import { Component } from '@angular/core';
import { TranslocoPipe } from '@ngneat/transloco';

@Component({
  standalone: true,
  selector: 'app-dashboard-page',
  imports: [TranslocoPipe],
  template: `
    <section class="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-5xl flex-col gap-4 px-4 py-12 sm:py-16">
      <header class="space-y-2 text-center sm:text-left">
        <p class="badge badge-primary badge-outline text-xs uppercase tracking-wide">
          {{ 'dashboard.badge' | transloco }}
        </p>
        <h1 class="text-3xl font-semibold sm:text-4xl">
          {{ 'dashboard.title' | transloco }}
        </h1>
        <p class="text-base-content/70 sm:max-w-2xl">
          {{ 'dashboard.description' | transloco }}
        </p>
      </header>

      <article
        class="grid flex-1 place-items-center rounded-3xl border border-dashed border-base-300 bg-base-100/70 px-6 py-16 text-center text-base-content/60 shadow-sm"
      >
        <div class="space-y-3">
          <h2 class="text-xl font-semibold">{{ 'dashboard.placeholder.title' | transloco }}</h2>
          <p class="max-w-xl text-sm sm:text-base">
            {{ 'dashboard.placeholder.body' | transloco }}
          </p>
        </div>
      </article>
    </section>
  `,
})
export class DashboardPageComponent {}

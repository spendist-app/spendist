import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <header class="space-y-2">
        <h1 class="text-3xl font-semibold">Settings</h1>
        <p class="text-base-content/70">
          Manage your preferences here. More options are coming soon.
        </p>
      </header>

      <div class="card bg-base-100 shadow-lg">
        <div class="card-body">
          <h2 class="card-title text-lg">Profile</h2>
          <p class="text-base-content/70">
            Profile configuration will be available in a future update.
          </p>
        </div>
      </div>
    </section>
  `,
})
export class SettingsPageComponent {}

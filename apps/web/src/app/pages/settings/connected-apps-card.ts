import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';

export const SPENDIST_MCP_URL = 'https://mcp.spendist.app/mcp';

@Component({
  standalone: true,
  selector: 'app-connected-apps-card',
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section
    class="rounded-2xl border border-base-300 bg-base-100/80 p-4 shadow-sm sm:p-6"
    aria-labelledby="connected-apps-heading"
  >
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <h3 id="connected-apps-heading" class="text-xl font-semibold">
          {{ 'connectedApps.title' | transloco }}
        </h3>
        <p class="mt-1 text-sm text-base-content/70">
          {{ 'connectedApps.subtitle' | transloco }}
        </p>
      </div>
      <a routerLink="/settings/connected-apps" class="btn btn-outline shrink-0">
        {{ 'connectedApps.manage' | transloco }}
      </a>
    </div>

    <div class="mt-5 space-y-2">
      <label for="mcp-server-url" class="text-sm font-semibold">
        {{ 'connectedApps.serverUrl' | transloco }}
      </label>
      <div class="join w-full">
        <input
          id="mcp-server-url"
          type="text"
          readonly
          class="input input-bordered join-item w-full font-mono text-sm"
          [value]="mcpUrl"
          (focus)="selectAll($event)"
        />
        <button
          type="button"
          class="btn btn-primary join-item"
          (click)="copy()"
        >
          {{
            (copied() ? 'connectedApps.copied' : 'connectedApps.copy')
              | transloco
          }}
        </button>
      </div>
    </div>

    <h4 class="mt-5 text-sm font-semibold">
      {{ 'connectedApps.howTo' | transloco }}
    </h4>
    <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm text-base-content/80">
      <li>{{ 'connectedApps.steps.add' | transloco }}</li>
      <li>{{ 'connectedApps.steps.approve' | transloco }}</li>
      <li>{{ 'connectedApps.steps.manage' | transloco }}</li>
    </ol>
  </section>`,
})
export class ConnectedAppsCard {
  protected readonly mcpUrl = SPENDIST_MCP_URL;
  readonly copied = signal(false);

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.mcpUrl);
      this.copied.set(true);
    } catch {
      // The read-only field stays selectable for manual copying.
      this.copied.set(false);
    }
  }

  protected selectAll(event: FocusEvent): void {
    if (event.target instanceof HTMLInputElement) event.target.select();
  }
}

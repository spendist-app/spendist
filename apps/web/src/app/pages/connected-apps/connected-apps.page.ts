import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { SUPABASE_CLIENT } from '../../core/supabase';

interface OAuthGrant {
  client: { id: string; name: string; uri: string; logo_uri: string };
  scopes: string[];
  granted_at: string;
}

@Component({
  standalone: true,
  selector: 'app-connected-apps-page',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './connected-apps.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedAppsPageComponent {
  private readonly supabase = inject(SUPABASE_CLIENT);
  readonly grants = signal<OAuthGrant[]>([]);
  readonly loading = signal(true);
  readonly revoking = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    afterNextRender(() => void this.load());
  }

  async revoke(clientId: string): Promise<void> {
    if (this.revoking()) return;
    this.revoking.set(clientId);
    this.error.set(null);
    const { error } = await this.supabase.auth.oauth.revokeGrant({ clientId });
    if (error) this.error.set(error.message);
    else
      this.grants.update((items) =>
        items.filter((item) => item.client.id !== clientId)
      );
    this.revoking.set(null);
  }

  private async load(): Promise<void> {
    const { data, error } = await this.supabase.auth.oauth.listGrants();
    if (error) this.error.set(error.message);
    else this.grants.set(data ?? []);
    this.loading.set(false);
  }
}

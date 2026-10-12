import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { SUPABASE_CLIENT } from '../../core/supabase';

interface OAuthAuthorizationDetails {
  authorization_id: string;
  redirect_url?: string;
  /** Supabase Auth returns the client's validated redirect URI for consent. */
  redirect_uri?: string;
  client: { id: string; name: string; uri: string; logo_uri: string };
  user: { id: string; email: string };
  scope: string;
}

export function redirectHost(uri: string | undefined): string | null {
  if (!uri) return null;

  try {
    return new URL(uri).host || null;
  } catch {
    return null;
  }
}

@Component({
  standalone: true,
  selector: 'app-oauth-consent-page',
  imports: [TranslocoPipe],
  templateUrl: './oauth-consent.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OAuthConsentPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly document = inject(DOCUMENT);

  readonly details = signal<OAuthAuthorizationDetails | null>(null);
  readonly loading = signal(true);
  readonly deciding = signal(false);
  readonly error = signal<string | null>(null);
  readonly allowWrite = signal(false);

  readonly redirectHost = computed(() =>
    redirectHost(this.details()?.redirect_uri)
  );

  private readonly authorizationId =
    this.route.snapshot.queryParamMap.get('authorization_id') ??
    this.route.snapshot.queryParamMap.get('authorizationId');

  constructor() {
    afterNextRender(() => void this.load());
  }

  toggleAllowWrite(): void {
    this.allowWrite.update((value) => !value);
  }

  async decide(action: 'approve' | 'deny'): Promise<void> {
    const details = this.details();

    if (!this.authorizationId || !details || this.deciding()) return;

    this.deciding.set(true);
    this.error.set(null);

    if (action === 'approve') {
      const { error } = await this.supabase.rpc(
        'set_mcp_client_write_access',
        { p_client_id: details.client.id, p_allow_write: this.allowWrite() }
      );

      if (error) {
        this.error.set(error.message);
        this.deciding.set(false);

        return;
      }
    }

    const response =
      action === 'approve'
        ? await this.supabase.auth.oauth.approveAuthorization(
            this.authorizationId,
            { skipBrowserRedirect: true }
          )
        : await this.supabase.auth.oauth.denyAuthorization(
            this.authorizationId,
            { skipBrowserRedirect: true }
          );

    if (response.error || !response.data?.redirect_url) {
      this.error.set(response.error?.message ?? 'OAuth redirect is missing.');
      this.deciding.set(false);

      return;
    }

    this.document.location.assign(response.data.redirect_url);
  }

  private async load(): Promise<void> {
    if (!this.authorizationId) {
      this.error.set('Missing authorization_id.');
      this.loading.set(false);

      return;
    }

    const { data, error } =
      await this.supabase.auth.oauth.getAuthorizationDetails(
        this.authorizationId
      );

    if (error || !data) {
      this.error.set(error?.message ?? 'Authorization request was not found.');
      this.loading.set(false);

      return;
    }

    if (data.redirect_url) {
      this.document.location.assign(data.redirect_url);

      return;
    }

    this.details.set(data);
    this.loading.set(false);
  }
}

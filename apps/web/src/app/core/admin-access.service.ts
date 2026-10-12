import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SUPABASE_CLIENT } from './supabase';

@Injectable({ providedIn: 'root' })
export class AdminAccessService {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SUPABASE_CLIENT);
  private version = 0;
  readonly allowed = signal(false);

  constructor() {
    effect(() => {
      const state = this.auth.authState();
      const version = ++this.version;
      this.allowed.set(false);

      if (!state.loading && state.session) void this.check(version);
    });
  }

  private async check(version: number): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('email_admin_status');

      if (version === this.version) this.allowed.set(!error);
    } catch {
      if (version === this.version) this.allowed.set(false);
    }
  }
}

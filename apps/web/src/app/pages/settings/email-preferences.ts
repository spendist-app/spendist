import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@ngneat/transloco';
import { AuthService } from '../../core/auth.service';
import { SUPABASE_CLIENT } from '../../core/supabase';

@Component({
  standalone: true,
  selector: 'app-email-preferences',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="mb-6 rounded-box border border-base-300 p-5">
    <h2 class="text-lg font-semibold">
      {{ 'emailPreferences.title' | transloco }}
    </h2>
    <p class="my-2 text-sm">{{ 'emailPreferences.description' | transloco }}</p>
    <label class="flex items-center gap-3">
      <input
        type="checkbox"
        class="toggle toggle-primary"
        [checked]="enabled()"
        [disabled]="busy()"
        (change)="toggle()"
      />
      {{ 'emailPreferences.label' | transloco }}
    </label>
    @if (error()) {
    <p role="alert" class="mt-2 text-error">
      {{ 'emailPreferences.error' | transloco }}
    </p>
    }
  </section>`,
})
export class EmailPreferences {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SUPABASE_CLIENT);
  readonly enabled = signal(false);
  readonly busy = signal(true);
  readonly error = signal(false);

  constructor() {
    void this.load();
  }

  async toggle(): Promise<void> {
    const id = this.auth.session()?.user.id;

    if (!id || this.busy()) return;

    this.busy.set(true);
    this.error.set(false);

    try {
      const next = !this.enabled();

      const { error } = await this.supabase
        .from('profiles')
        .update({ email_notifications: next })
        .eq('id', id);

      if (error) throw new Error('Preference update unavailable');

      this.enabled.set(next);
    } catch {
      this.error.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  private async load(): Promise<void> {
    const id = this.auth.session()?.user.id;

    try {
      if (!id) return;

      const { data, error } = await this.supabase
        .from('profiles')
        .select('email_notifications')
        .eq('id', id)
        .single();

      if (error) throw new Error('Preference unavailable');

      this.enabled.set(data.email_notifications);
    } catch {
      this.error.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}

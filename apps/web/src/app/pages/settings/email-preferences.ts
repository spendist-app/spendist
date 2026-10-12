import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@ngneat/transloco';
import { AdminAccessService } from '../../core/admin-access.service';
import { AuthService } from '../../core/auth.service';
import {
  ADMIN_EMAIL_NOTIFICATION_TYPES,
  EMAIL_NOTIFICATION_TYPES,
  type EmailNotificationType,
} from '../../core/notifications/email-notification-types';
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
    @if (enabled()) {
    <fieldset class="mt-4">
      <legend class="mb-2 text-sm font-medium">
        {{ 'emailPreferences.typesLabel' | transloco }}
      </legend>
      <div class="grid gap-2 sm:grid-cols-2">
        @for (type of types(); track type) {
        <label class="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            class="checkbox checkbox-sm checkbox-primary"
            [checked]="!muted().includes(type)"
            [disabled]="busy()"
            (change)="toggleType(type)"
          />
          {{ 'emailPreferences.types.' + type | transloco }}
        </label>
        }
      </div>
    </fieldset>
    } @if (error()) {
    <p role="alert" class="mt-2 text-error">
      {{ 'emailPreferences.error' | transloco }}
    </p>
    }
  </section>`,
})
export class EmailPreferences {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly adminAccess = inject(AdminAccessService);
  readonly enabled = signal(false);
  readonly muted = signal<readonly string[]>([]);
  readonly busy = signal(true);
  readonly error = signal(false);
  readonly types = computed(() =>
    EMAIL_NOTIFICATION_TYPES.filter(
      (type) =>
        this.adminAccess.allowed() ||
        !ADMIN_EMAIL_NOTIFICATION_TYPES.includes(type)
    )
  );

  constructor() {
    void this.load();
  }

  async toggle(): Promise<void> {
    const next = !this.enabled();

    if (await this.save({ email_notifications: next })) this.enabled.set(next);
  }

  async toggleType(type: EmailNotificationType): Promise<void> {
    const current = this.muted();

    const next = current.includes(type)
      ? current.filter((muted) => muted !== type)
      : [...current, type];

    if (await this.save({ email_notification_muted_types: [...next] })) {
      this.muted.set(next);
    }
  }

  private async save(
    changes:
      | { email_notifications: boolean }
      | { email_notification_muted_types: string[] }
  ): Promise<boolean> {
    const id = this.auth.session()?.user.id;

    if (!id || this.busy()) return false;

    this.busy.set(true);
    this.error.set(false);

    try {
      const { error } = await this.supabase
        .from('profiles')
        .update(changes)
        .eq('id', id);

      if (error) throw new Error('Preference update unavailable');

      return true;
    } catch {
      this.error.set(true);

      return false;
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
        .select('email_notifications, email_notification_muted_types')
        .eq('id', id)
        .single();

      if (error) throw new Error('Preference unavailable');

      this.enabled.set(data.email_notifications);
      this.muted.set(data.email_notification_muted_types);
    } catch {
      this.error.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslocoPipe } from '@ngneat/transloco';
import { z } from 'zod';
import { SUPABASE_CLIENT } from '../../core/supabase';

const statusSchema = z.object({
  enabled: z.boolean(),
  app_limit: z.number(),
  expected_aws_limit: z.number(),
  expected_rate: z.number(),
  region: z.string().nullable(),
  attempts_24h: z.number(),
  sent_24h: z.number(),
  last_attempt_at: z.string().nullable(),
  last_success_at: z.string().nullable(),
  read_error: z.boolean(),
  snapshot: z
    .object({
      sent_24h: z.number(),
      aws_limit: z.number(),
      max_rate: z.number(),
      sending_enabled: z.boolean(),
      production_access: z.boolean(),
      enforcement_status: z.string(),
    })
    .nullable(),
  queue: z.object({
    queued: z.number().default(0),
    sending: z.number().default(0),
    sent: z.number().default(0),
    failed: z.number().default(0),
    unknown: z.number().default(0),
    expired: z.number().default(0),
  }),
  alerts: z.array(
    z.object({
      code: z.string(),
      active: z.boolean(),
      created_at: z.string(),
      published_at: z.string().nullable(),
      publish_attempts: z.number(),
    })
  ),
});

@Component({
  standalone: true,
  selector: 'app-admin-page',
  imports: [TranslocoPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin.page.html',
})
export class AdminPage {
  private readonly supabase = inject(SUPABASE_CLIENT);
  readonly status = signal<z.infer<typeof statusSchema> | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    if (this.loading()) return;

    this.status.set(null);
    this.loading.set(true);
    this.error.set(false);

    try {
      const { data, error } = await this.supabase.rpc('email_admin_status');

      if (error) throw new Error('Admin status unavailable');

      this.status.set(statusSchema.parse(data));
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  stale(timestamp: string | null): boolean {
    return !timestamp || Date.now() - Date.parse(timestamp) > 10 * 60 * 1000;
  }
}

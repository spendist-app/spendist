import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { heroArrowPath } from '@ng-icons/heroicons/outline';
import { TranslocoPipe } from '@ngneat/transloco';
import { z } from 'zod';
import { FeatureFlagsService } from '../../core/feature-flags.service';
import { LanguageService } from '../../core/language.service';
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

const count = z.number().int().nonnegative();

// Aggregate counts only; the RPC never returns identifiers.
const usageSchema = z.object({
  generated_at: z.string(),
  totals: z.object({
    accounts: count,
    confirmed: count,
    with_transaction: count,
    first_use: count,
    regular_28d: count,
    active_7d: count,
    signed_in_14d: count,
  }),
  recent: z.object({
    accounts_7d: count,
    accounts_28d: count,
    first_use_7d: count,
  }),
  returns: z.object({ windows: count, returned: count }),
  funnel_28d: z.object({
    registered: count,
    confirmed: count,
    signed_in: count,
    with_transaction: count,
    first_use: count,
  }),
  weeks: z.array(
    z.object({
      week_start: z.string(),
      new_accounts: count,
      first_uses: count,
      active_accounts: count,
    })
  ),
});

const FUNNEL_STEPS = [
  'registered',
  'confirmed',
  'signed_in',
  'with_transaction',
  'first_use',
] as const;

type MeterTone = 'primary' | 'warning' | 'error';

type EmailHealth = 'ok' | 'stale' | 'disabled';

const STALE_AFTER_MS = 10 * 60 * 1000;

function percentOf(value: number, whole: number): number {
  if (whole <= 0) return 0;

  return Math.min(100, Math.round((value / whole) * 100));
}

// Same thresholds as the monitor's usage alerts.
function meterTone(percent: number): MeterTone {
  if (percent >= 95) return 'error';

  return percent >= 80 ? 'warning' : 'primary';
}

@Component({
  standalone: true,
  selector: 'app-admin-page',
  imports: [TranslocoPipe, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin.page.html',
})
export class AdminPage {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly language = inject(LanguageService);
  private readonly locale = computed(() =>
    this.language.currentLanguage() === 'pl' ? 'pl-PL' : 'en-US'
  );
  readonly featureFlags = inject(FeatureFlagsService);
  readonly refreshIcon = heroArrowPath;
  readonly status = signal<z.infer<typeof statusSchema> | null>(null);
  readonly usage = signal<z.infer<typeof usageSchema> | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly usageError = signal(false);

  readonly funnel = computed(() => {
    const steps = this.usage()?.funnel_28d;

    if (!steps) return [];

    return FUNNEL_STEPS.map((key) => ({
      key,
      value: steps[key],
      percent: percentOf(steps[key], steps.registered),
    }));
  });

  // Newest week first, so the current week is visible without scrolling.
  readonly weeks = computed(() => (this.usage()?.weeks ?? []).toReversed());

  readonly emailHealth = computed<EmailHealth | null>(() => {
    const state = this.status();

    if (!state) return null;

    if (state.read_error || this.stale(state.last_success_at)) return 'stale';

    return state.enabled && state.snapshot?.sending_enabled ? 'ok' : 'disabled';
  });

  readonly emailMeters = computed(() => {
    const state = this.status();

    if (!state) return [];

    const reserved = percentOf(state.attempts_24h, state.app_limit);
    const awsLimit = state.snapshot?.aws_limit ?? 0;
    const awsSent = state.snapshot?.sent_24h ?? 0;
    const aws = percentOf(awsSent, awsLimit);

    return [
      {
        label: 'emailAdmin.attempts',
        value: state.attempts_24h,
        limit: state.app_limit,
        percent: reserved,
        tone: meterTone(reserved),
      },
      {
        label: 'emailAdmin.awsUsage',
        value: state.snapshot ? awsSent : null,
        limit: state.snapshot ? awsLimit : null,
        percent: aws,
        tone: meterTone(aws),
      },
    ];
  });

  constructor() {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    if (this.loading()) return;

    this.loading.set(true);

    await Promise.all([this.loadUsage(), this.loadStatus()]);

    this.loading.set(false);
  }

  formatMoment(timestamp: string | null): string {
    if (!timestamp) return '—';

    return new Intl.DateTimeFormat(this.locale(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp));
  }

  // week_start is a calendar date; noon keeps it on the same day in every time zone.
  formatDay(day: string): string {
    return new Intl.DateTimeFormat(this.locale(), {
      dateStyle: 'medium',
    }).format(new Date(`${day}T12:00:00`));
  }

  stale(timestamp: string | null): boolean {
    return !timestamp || Date.now() - Date.parse(timestamp) > STALE_AFTER_MS;
  }

  private async loadStatus(): Promise<void> {
    this.error.set(false);

    try {
      const { data, error } = await this.supabase.rpc('email_admin_status');

      if (error) throw new Error('Admin status unavailable');

      this.status.set(statusSchema.parse(data));
    } catch {
      this.status.set(null);
      this.error.set(true);
    }
  }

  private async loadUsage(): Promise<void> {
    this.usageError.set(false);

    try {
      const { data, error } = await this.supabase.rpc('admin_usage_status');

      if (error) throw new Error('Usage statistics unavailable');

      this.usage.set(usageSchema.parse(data));
    } catch {
      this.usage.set(null);
      this.usageError.set(true);
    }
  }
}

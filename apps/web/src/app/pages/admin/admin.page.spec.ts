import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FeatureFlagsService } from '../../core/feature-flags.service';
import { LanguageService } from '../../core/language.service';
import { SUPABASE_CLIENT } from '../../core/supabase';
import { AdminPage } from './admin.page';

const usage = {
  generated_at: '2026-11-13T08:00:00+00:00',
  totals: {
    accounts: 25,
    confirmed: 22,
    with_transaction: 9,
    first_use: 6,
    regular_28d: 2,
    active_7d: 3,
    signed_in_14d: 12,
  },
  recent: { accounts_7d: 5, accounts_28d: 16, first_use_7d: 0 },
  returns: { windows: 5, returned: 3 },
  funnel_28d: {
    registered: 16,
    confirmed: 14,
    signed_in: 12,
    with_transaction: 4,
    first_use: 1,
  },
  weeks: [
    {
      week_start: '2026-11-02',
      new_accounts: 4,
      first_uses: 1,
      active_accounts: 2,
    },
    {
      week_start: '2026-11-09',
      new_accounts: 5,
      first_uses: 0,
      active_accounts: 3,
    },
  ],
};

function emailStatus(attempts: number, lastSuccessAt: string | null) {
  return {
    enabled: true,
    app_limit: 100,
    expected_aws_limit: 200,
    expected_rate: 1,
    region: 'eu-central-1',
    attempts_24h: attempts,
    sent_24h: attempts,
    last_attempt_at: lastSuccessAt,
    last_success_at: lastSuccessAt,
    read_error: false,
    snapshot: {
      sent_24h: 10,
      aws_limit: 200,
      max_rate: 1,
      sending_enabled: true,
      production_access: true,
      enforcement_status: 'HEALTHY',
    },
    queue: { queued: 1, sent: 4 },
    alerts: [],
  };
}

describe('AdminPage', () => {
  async function setup(
    results: Record<string, { data: object | null; error: object | null }>
  ) {
    const rpc = vi.fn(async (name: string) => results[name]);

    TestBed.configureTestingModule({
      providers: [
        { provide: SUPABASE_CLIENT, useValue: { rpc } },
        {
          provide: FeatureFlagsService,
          useValue: { previewHidden: signal(false), setPreviewHidden: vi.fn() },
        },
        {
          provide: LanguageService,
          useValue: { currentLanguage: signal('pl') },
        },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new AdminPage());

    await vi.waitFor(() => expect(component.loading()).toBe(false));

    return { component, rpc };
  }

  it('loads usage and email status and derives the funnel', async () => {
    const { component, rpc } = await setup({
      admin_usage_status: { data: usage, error: null },
      email_admin_status: {
        data: emailStatus(40, new Date().toISOString()),
        error: null,
      },
    });

    expect(rpc).toHaveBeenCalledWith('admin_usage_status');
    expect(rpc).toHaveBeenCalledWith('email_admin_status');
    expect(component.usageError()).toBe(false);
    expect(component.funnel()).toEqual([
      { key: 'registered', value: 16, percent: 100 },
      { key: 'confirmed', value: 14, percent: 88 },
      { key: 'signed_in', value: 12, percent: 75 },
      { key: 'with_transaction', value: 4, percent: 25 },
      { key: 'first_use', value: 1, percent: 6 },
    ]);
    expect(component.weeks()[0].week_start).toBe('2026-11-09');
    expect(component.emailHealth()).toBe('ok');
    expect(component.formatDay('2026-11-09')).toBe('9 lis 2026');
    expect(component.formatMoment(null)).toBe('—');
  });

  it('marks email meters by the 80% and 95% thresholds', async () => {
    const { component } = await setup({
      admin_usage_status: { data: usage, error: null },
      email_admin_status: {
        data: emailStatus(96, new Date().toISOString()),
        error: null,
      },
    });

    const [reserved, aws] = component.emailMeters();

    expect(reserved.tone).toBe('error');
    expect(reserved.percent).toBe(96);
    expect(aws.tone).toBe('primary');
  });

  it('reports a stale email reading without hiding usage', async () => {
    const { component } = await setup({
      admin_usage_status: { data: usage, error: null },
      email_admin_status: { data: emailStatus(1, null), error: null },
    });

    expect(component.emailHealth()).toBe('stale');
    expect(component.usage()?.totals.accounts).toBe(25);
  });

  it('keeps email status when usage statistics fail', async () => {
    const { component } = await setup({
      admin_usage_status: { data: null, error: { message: 'denied' } },
      email_admin_status: {
        data: emailStatus(1, new Date().toISOString()),
        error: null,
      },
    });

    expect(component.usageError()).toBe(true);
    expect(component.usage()).toBeNull();
    expect(component.error()).toBe(false);
    expect(component.status()?.app_limit).toBe(100);
  });

  it('rejects usage data that is not aggregate counts', async () => {
    const { component } = await setup({
      admin_usage_status: {
        data: { ...usage, totals: { ...usage.totals, accounts: 'many' } },
        error: null,
      },
      email_admin_status: {
        data: emailStatus(1, new Date().toISOString()),
        error: null,
      },
    });

    expect(component.usageError()).toBe(true);
  });
});

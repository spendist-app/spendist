import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AdminAccessService } from '../../core/admin-access.service';
import { AuthService } from '../../core/auth.service';
import { SUPABASE_CLIENT } from '../../core/supabase';
import { EmailPreferences } from './email-preferences';

interface Profile {
  email_notifications: boolean;
  email_notification_muted_types: string[];
}

function createSupabase(
  profile: Profile,
  updateError: { message: string } | null = null
) {
  const single = vi.fn(async () => ({ data: profile, error: null }));

  const updateEq = vi.fn(async () => ({ error: updateError }));

  const update = vi.fn(() => ({ eq: updateEq }));

  const from = vi.fn(() => ({
    select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })),
    update,
  }));

  return { client: { from }, update, updateEq };
}

describe('EmailPreferences', () => {
  async function setup(
    profile: Profile,
    options: { admin?: boolean; updateError?: { message: string } } = {}
  ) {
    const supabase = createSupabase(profile, options.updateError);

    TestBed.configureTestingModule({
      providers: [
        { provide: SUPABASE_CLIENT, useValue: supabase.client },
        {
          provide: AuthService,
          useValue: { session: signal({ user: { id: 'user-1' } }) },
        },
        {
          provide: AdminAccessService,
          useValue: { allowed: signal(options.admin ?? false) },
        },
      ],
    });

    const component = TestBed.runInInjectionContext(
      () => new EmailPreferences()
    );

    await vi.waitFor(() => expect(component.busy()).toBe(false));

    return { component, ...supabase };
  }

  it('loads the global switch and muted types', async () => {
    const { component } = await setup({
      email_notifications: true,
      email_notification_muted_types: ['allowance_received'],
    });

    expect(component.enabled()).toBe(true);
    expect(component.muted()).toEqual(['allowance_received']);
  });

  it('saves the global switch', async () => {
    const { component, update, updateEq } = await setup({
      email_notifications: false,
      email_notification_muted_types: [],
    });

    await component.toggle();

    expect(update).toHaveBeenCalledWith({ email_notifications: true });
    expect(updateEq).toHaveBeenCalledWith('id', 'user-1');
    expect(component.enabled()).toBe(true);
  });

  it('mutes and unmutes a single notification type', async () => {
    const { component, update } = await setup({
      email_notifications: true,
      email_notification_muted_types: ['recurring_transaction_ended'],
    });

    await component.toggleType('allowance_received');

    expect(update).toHaveBeenLastCalledWith({
      email_notification_muted_types: [
        'recurring_transaction_ended',
        'allowance_received',
      ],
    });

    await component.toggleType('recurring_transaction_ended');

    expect(update).toHaveBeenLastCalledWith({
      email_notification_muted_types: ['allowance_received'],
    });
    expect(component.muted()).toEqual(['allowance_received']);
  });

  it('shows the exchange rate type only to administrators', async () => {
    const { component } = await setup({
      email_notifications: true,
      email_notification_muted_types: [],
    });

    expect(component.types()).not.toContain('exchange_rates_sync_failed');

    TestBed.resetTestingModule();

    const admin = await setup(
      { email_notifications: true, email_notification_muted_types: [] },
      { admin: true }
    );

    expect(admin.component.types()).toContain('exchange_rates_sync_failed');
  });

  it('keeps the previous state when saving fails', async () => {
    const { component } = await setup(
      { email_notifications: true, email_notification_muted_types: [] },
      { updateError: { message: 'denied' } }
    );

    await component.toggleType('allowance_received');

    expect(component.muted()).toEqual([]);
    expect(component.error()).toBe(true);
  });
});

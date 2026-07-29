import { computed, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth.service';
import { ProfileService, type ProfileEntity } from '../../core/profile.service';
import { SUPABASE_CLIENT } from '../../core/supabase';
import { SettingsStore } from './settings.store';

class AuthServiceStub {
  readonly loading = signal(true);
  readonly session = signal(null);
}

class ProfileServiceStub {
  readonly profile = signal<ProfileEntity | null>(null);
  readonly avatarUrl = computed(() => this.profile()?.avatarUrl ?? null);
  readonly setProfile = vi.fn((profile: ProfileEntity | null) => {
    this.profile.set(profile);
  });
}

function profileRow() {
  return {
    id: 'user-1',
    username: 'emily',
    full_name: 'Emily Carter',
    avatar_url: null,
    language: 'en',
    timezone: 'America/Chicago',
  };
}

function createSupabaseMock() {
  const single = vi.fn().mockResolvedValue({
    data: profileRow(),
    error: null,
  });
  const select = vi.fn(() => ({ single }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));

  return {
    from: vi.fn(() => ({ update })),
    update,
    eq,
    select,
    single,
  };
}

describe('SettingsStore profile updates', () => {
  let store: SettingsStore;
  let supabase: ReturnType<typeof createSupabaseMock>;
  let profileService: ProfileServiceStub;

  beforeEach(() => {
    supabase = createSupabaseMock();
    TestBed.configureTestingModule({
      providers: [
        SettingsStore,
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: ProfileService, useClass: ProfileServiceStub },
        { provide: SUPABASE_CLIENT, useValue: supabase },
      ],
    });

    store = TestBed.inject(SettingsStore);
    profileService = TestBed.inject(
      ProfileService
    ) as unknown as ProfileServiceStub;
    (
      store as unknown as {
        userId: WritableSignal<string | null>;
      }
    ).userId.set('user-1');
  });

  it('partially updates and publishes the refreshed profile', async () => {
    const updated = await store.updateProfile({ language: 'en' });

    expect(supabase.update).toHaveBeenCalledWith({ language: 'en' });
    expect(supabase.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(profileService.setProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        language: 'en',
        timezone: 'America/Chicago',
      })
    );
    expect(updated.fullName).toBe('Emily Carter');
  });

  it('surfaces a localized autosave error without replacing the profile', async () => {
    supabase.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST000', message: 'request failed' },
    });

    await expect(
      store.updateProfile({ fullName: 'Updated name' })
    ).rejects.toThrow('settings.panels.profile.autosave.errors.generic');
    expect(profileService.setProfile).not.toHaveBeenCalled();
    expect(store.profileError()).toBe(
      'settings.panels.profile.autosave.errors.generic'
    );
  });
});

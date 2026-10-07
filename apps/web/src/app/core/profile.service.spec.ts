import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { LanguageService } from './language.service';
import {
  mapProfileRow,
  ProfileService,
  type ProfileEntity,
} from './profile.service';
import type { Tables } from '@spendist/data-access/supabase-types';
import { SUPABASE_CLIENT } from './supabase';

class AuthServiceStub {
  private readonly loadingState = signal(true);
  readonly loading = computed(() => this.loadingState());
  readonly session = signal(null);
}

class LanguageServiceStub {
  readonly setLanguage = vi.fn();
}

function profile(language: string): ProfileEntity {
  return {
    id: 'profile-1',
    fullName: 'Emily Carter',
    username: 'emily',
    avatarUrl: null,
    language,
    timezone: 'America/Chicago',
  };
}

describe('ProfileService language synchronization', () => {
  let service: ProfileService;
  let languageService: LanguageServiceStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        AuthServiceStub,
        { provide: AuthService, useExisting: AuthServiceStub },
        LanguageServiceStub,
        { provide: LanguageService, useExisting: LanguageServiceStub },
        { provide: SUPABASE_CLIENT, useValue: {} },
      ],
    });

    service = TestBed.inject(ProfileService);
    languageService = TestBed.inject(LanguageServiceStub);
  });

  it('applies a supported language from the authenticated profile', () => {
    service.setProfile(profile('en'));

    expect(languageService.setLanguage).toHaveBeenCalledWith('en');
    expect(service.profile()?.language).toBe('en');
  });

  it('ignores an unsupported profile language', () => {
    service.setProfile(profile('de'));

    expect(languageService.setLanguage).not.toHaveBeenCalled();
    expect(service.profile()?.language).toBe('de');
  });
});

describe('legacy default avatars', () => {
  function row(avatarUrl: string): Tables<'profiles'> {
    return {
      id: 'profile-1',
      full_name: 'Emily Carter',
      username: 'emily',
      avatar_url: avatarUrl,
      language: 'en',
      timezone: 'UTC',
      created_at: '2026-09-30T12:00:00.000Z',
      creation_date: '2026-09-30T12:00:00.000Z',
      updated_at: '2026-09-30T12:00:00.000Z',
      is_admin: false,
      email_notifications: false,
    };
  }

  it('uses the local fallback for existing DiceBear URLs', () => {
    expect(
      mapProfileRow(row('https://api.dicebear.com/7.x/initials/svg?seed=emily'))
        .avatarUrl
    ).toBeNull();
  });

  it('preserves an uploaded avatar', () => {
    const url =
      'https://project.supabase.co/storage/v1/object/public/avatars/profile-1/avatar.png';

    expect(mapProfileRow(row(url)).avatarUrl).toBe(url);
  });
});

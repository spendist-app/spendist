import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { LanguageService } from './language.service';
import { ProfileService, type ProfileEntity } from './profile.service';
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
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: LanguageService, useClass: LanguageServiceStub },
        { provide: SUPABASE_CLIENT, useValue: {} },
      ],
    });

    service = TestBed.inject(ProfileService);
    languageService = TestBed.inject(
      LanguageService
    ) as unknown as LanguageServiceStub;
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

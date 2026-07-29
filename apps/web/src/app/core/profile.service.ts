import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Tables } from '@spendist/data-access/supabase-types';
import { AuthService } from './auth.service';
import { LanguageService } from './language.service';
import { logError } from './logger';
import { SUPABASE_CLIENT } from './supabase';
import {
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from '../i18n/languages';

type ProfileRow = Tables<'profiles'>;

export interface ProfileEntity {
  readonly id: string;
  readonly fullName: string;
  readonly username: string;
  readonly avatarUrl: string | null;
  readonly language: string;
  readonly timezone: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly supabase = inject<SupabaseClient>(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly profileState = signal<ProfileEntity | null>(null);
  private activeUserId: string | null = null;
  private requestToken = 0;

  readonly profile = computed(() => this.profileState());
  readonly avatarUrl = computed(() => this.profile()?.avatarUrl ?? null);

  constructor() {
    effect(() => {
      if (this.auth.loading()) {
        return;
      }

      const userId = this.auth.session()?.user.id ?? null;
      if (userId === this.activeUserId) {
        return;
      }

      this.activeUserId = userId;
      if (!userId) {
        this.requestToken += 1;
        this.profileState.set(null);
        return;
      }

      void this.loadProfile(userId);
    });
  }

  setProfile(profile: ProfileEntity | null): void {
    this.profileState.set(profile);
    this.activeUserId = profile?.id ?? this.activeUserId;
    this.applyProfileLanguage(profile);
  }

  private async loadProfile(userId: string): Promise<void> {
    const token = ++this.requestToken;

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (token !== this.requestToken) {
        return;
      }

      if (error) {
        throw error;
      }

      this.setProfile(data ? mapProfileRow(data as ProfileRow) : null);
    } catch (error) {
      if (token === this.requestToken) {
        this.profileState.set(null);
      }
      logError('ProfileService', 'Failed to load profile', error);
    }
  }

  private applyProfileLanguage(profile: ProfileEntity | null): void {
    if (!profile) {
      return;
    }

    const language = profile.language;
    if (
      SUPPORTED_LANGUAGES.some((option) => option.code === language)
    ) {
      this.languageService.setLanguage(language as LanguageCode);
    }
  }
}

export function mapProfileRow(row: ProfileRow): ProfileEntity {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    avatarUrl: row.avatar_url ?? null,
    language: row.language,
    timezone: row.timezone,
  };
}

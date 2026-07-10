import { EnvironmentInjector, Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { PostgrestError, Session, User } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './supabase';
import { ensureDefaultCategoriesForUser } from './default-categories';
import { DEFAULT_LANGUAGE, LanguageCode } from '../i18n/languages';
import { logError } from './logger';

const DEFAULT_CURRENCY_ID = 1;

interface AuthState {
  session: Session | null;
  loading: boolean;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  email: string;
  password: string;
  username: string;
  fullName: string;
  timezone: string;
  language?: string;
  defaultCurrencyId?: number;
  avatarUrl?: string | null;
}

export interface AuthResult {
  user?: User;
  error?: string;
}

export interface PasswordRecoveryResult {
  error?: string;
}

/**
 * Keeps Supabase authentication state in sync with Angular signals so UI and routing
 * can react without relying on zones.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly environmentInjector = inject(EnvironmentInjector);

  private readonly state = signal<AuthState>({
    session: null,
    loading: true,
  });

  readonly authState = computed(() => this.state());
  readonly session = computed(() => this.authState().session);
  readonly loading = computed(() => this.authState().loading);
  readonly isAuthenticated = computed(() => !!this.session());

  private readonly subscription = this.supabase.auth.onAuthStateChange((event, session) => {
    this.runInContext(() => {
      this.state.set({
        session: session ?? null,
        loading: false,
      });
    });

    if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
      void this.seedDefaultCategories(session);
    }
  }).data.subscription;

  constructor() {
    this.syncInitialSession();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  async signInWithPassword(payload: SignInPayload): Promise<AuthResult> {
    try {
      const { error, data } = await this.supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      });

      if (error) {
        return { error: error.message };
      }

      return { user: data.user };
    } catch (error) {
      return { error: this.normalizeUnknownError(error) };
    }
  }

  async requestPasswordReset(email: string): Promise<PasswordRecoveryResult> {
    try {
      const redirectTo = this.resolveAuthRedirectUrl('/reset-password');
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: this.normalizeUnknownError(error) };
    }
  }

  async establishPasswordRecoverySession(
    url: string
  ): Promise<PasswordRecoveryResult> {
    try {
      const parsedUrl = new URL(url);
      const params = new URLSearchParams(parsedUrl.search);

      if (parsedUrl.hash.length > 1) {
        const hashParams = new URLSearchParams(parsedUrl.hash.slice(1));
        hashParams.forEach((value, key) => {
          if (!params.has(key)) {
            params.set(key, value);
          }
        });
      }

      const code = params.get('code');
      if (code) {
        const { error } = await this.supabase.auth.exchangeCodeForSession(code);
        return error ? { error: error.message } : {};
      }

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await this.supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        return error ? { error: error.message } : {};
      }

      const tokenHash = params.get('token_hash');
      if (tokenHash) {
        const { error } = await this.supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        return error ? { error: error.message } : {};
      }

      const { data, error } = await this.supabase.auth.getSession();
      if (error) {
        return { error: error.message };
      }

      return data.session
        ? {}
        : { error: 'Password reset link is missing or has expired.' };
    } catch (error) {
      return { error: this.normalizeUnknownError(error) };
    }
  }

  async updatePassword(password: string): Promise<PasswordRecoveryResult> {
    try {
      const { error } = await this.supabase.auth.updateUser({ password });
      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: this.normalizeUnknownError(error) };
    }
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<PasswordRecoveryResult> {
    const email = this.session()?.user.email;
    if (!email) {
      return { error: 'You need to sign in again before changing your password.' };
    }

    const reauthResult = await this.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (reauthResult.error) {
      return { error: 'Current password is incorrect.' };
    }

    return this.updatePassword(newPassword);
  }

  async signUp(payload: SignUpPayload): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            username: payload.username,
            full_name: payload.fullName,
            language: payload.language ?? 'en',
            default_currency_id: payload.defaultCurrencyId ?? DEFAULT_CURRENCY_ID,
            wallet_currency_id: payload.defaultCurrencyId ?? DEFAULT_CURRENCY_ID,
            timezone: payload.timezone,
            avatar_url: payload.avatarUrl ?? null,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      const user = data.user;
      if (!user) {
        return { error: 'User could not be created. Please try again.' };
      }

      if (data.session) {
        const { error: profileError } = await this.supabase
          .from('profiles')
          .update(
          {
            full_name: payload.fullName,
            avatar_url: payload.avatarUrl ?? null,
            language: payload.language ?? 'en',
            timezone: payload.timezone,
          }
          )
          .eq('id', user.id);

        if (profileError) {
          return { error: this.normalizeProfileError(profileError) };
        }

      }

      return { user };
    } catch (error) {
      return { error: this.normalizeUnknownError(error) };
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        logError('AuthService', 'Failed to sign out', error);
      }
    } catch (error) {
      logError('AuthService', 'Failed to sign out', error);
    }
  }

  private async syncInitialSession(): Promise<void> {
    try {
      const { data } = await this.supabase.auth.getSession();
      this.runInContext(() => {
        this.state.set({
          session: data.session ?? null,
          loading: false,
        });
      });
    } catch (error) {
      this.runInContext(() => {
        this.state.set({
          session: null,
          loading: false,
        });
      });
      logError('AuthService', 'Failed to load Supabase session', error);
    }
  }

  private runInContext(fn: () => void): void {
    this.environmentInjector.runInContext(fn);
  }

  private async seedDefaultCategories(session: Session): Promise<void> {
    const language = session.user.user_metadata['language'];
    const userLanguage = (
      typeof language === 'string' ? language : DEFAULT_LANGUAGE
    ) as LanguageCode;

    try {
      await ensureDefaultCategoriesForUser(this.supabase, session.user.id, userLanguage);
    } catch (seedError) {
      logError('AuthService', 'Failed to seed default categories', seedError);
    }
  }

  private normalizeProfileError(error: PostgrestError): string {
    if (error.code === '23505') {
      return 'That name is already taken. Please try a different variation.';
    }

    return error.message;
  }

  private normalizeUnknownError(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Something went wrong. Please try again.';
  }

  private resolveAuthRedirectUrl(path: string): string {
    if (typeof window === 'undefined') {
      return path;
    }

    return new URL(path, window.location.origin).toString();
  }
}

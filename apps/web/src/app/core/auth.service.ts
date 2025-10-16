import { EnvironmentInjector, Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { PostgrestError, Session, User } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './supabase';

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
  defaultCurrency?: string;
  avatarUrl?: string | null;
}

export interface AuthResult {
  user?: User;
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

  private readonly subscription = this.supabase.auth.onAuthStateChange((_event, session) => {
    this.runInContext(() => {
      this.state.set({
        session: session ?? null,
        loading: false,
      });
    });
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
            default_currency: payload.defaultCurrency ?? 'PLN',
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

      const { error: profileError } = await this.supabase.from('profiles').upsert(
        {
          id: user.id,
          username: payload.username,
          full_name: payload.fullName,
          avatar_url: payload.avatarUrl ?? null,
          default_currency: payload.defaultCurrency ?? 'PLN',
          language: payload.language ?? 'en',
          timezone: payload.timezone,
        },
        {
          onConflict: 'id',
        }
      );

      if (profileError) {
        return { error: this.normalizeProfileError(profileError) };
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
        console.error('Failed to sign out', error);
      }
    } catch (error) {
      console.error('Failed to sign out', error);
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
      console.error('Failed to load Supabase session', error);
    }
  }

  private runInContext(fn: () => void): void {
    this.environmentInjector.runInContext(fn);
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
}

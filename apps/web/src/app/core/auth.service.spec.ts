import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SUPABASE_CLIENT } from './supabase';

function createSupabaseMock() {
  const sessionState: { current: unknown } = { current: null };
  return {
    sessionState,
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ data: { session: sessionState.current } })
        ),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'new-user',
            email: 'new@example.com',
            user_metadata: {},
          },
          session: null,
        },
        error: null,
      }),
      resend: vi.fn().mockResolvedValue({ error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      setSession: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com', user_metadata: {} },
        },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { deleted: true },
        error: null,
      }),
    },
  };
}

describe('AuthService password flows', () => {
  let supabase: ReturnType<typeof createSupabaseMock>;

  beforeEach(() => {
    supabase = createSupabaseMock();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: SUPABASE_CLIENT,
          useValue: supabase,
        },
      ],
    });
  });

  it('requests password reset with reset-password redirect', async () => {
    const service = TestBed.inject(AuthService);

    const result = await service.requestPasswordReset('test@example.com');

    expect(result.error).toBeUndefined();
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/reset-password'),
      })
    );
  });

  it('exchanges recovery code from reset URL', async () => {
    const service = TestBed.inject(AuthService);

    const result = await service.establishPasswordRecoverySession(
      'http://localhost:4200/reset-password?code=recovery-code'
    );

    expect(result.error).toBeUndefined();
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith(
      'recovery-code'
    );
  });

  it('reauthenticates before changing password', async () => {
    supabase.sessionState.current = {
      user: { id: 'user-1', email: 'test@example.com', user_metadata: {} },
    };
    const service = TestBed.inject(AuthService);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const result = await service.changePassword('Current123', 'Next1234');

    expect(result.error).toBeUndefined();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Current123',
    });
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      password: 'Next1234',
    });
  });

  it('deletes the account through the Edge Function and clears the local session', async () => {
    const service = TestBed.inject(AuthService);

    const result = await service.deleteAccount('Current123');

    expect(result.error).toBeUndefined();
    expect(supabase.functions.invoke).toHaveBeenCalledWith('delete-account', {
      body: { password: 'Current123' },
    });
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(service.isAuthenticated()).toBe(false);
  });

  it('maps an invalid deletion password to a localized error', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: {
        context: new Response(JSON.stringify({ code: 'invalid_password' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
      },
    });
    const service = TestBed.inject(AuthService);

    const result = await service.deleteAccount('WrongPassword');

    expect(result.error).toBe(
      'settings.panels.profile.accountDeletion.errors.invalidPassword'
    );
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it('returns a confirmation-required result and preserves a safe return URL', async () => {
    const service = TestBed.inject(AuthService);

    const result = await service.signUp(
      {
        email: 'new@example.com',
        password: 'Password123',
        username: 'new_user',
        fullName: 'New User',
        timezone: 'Europe/Warsaw',
      },
      '/allowance/invite?token=invitation'
    );

    expect(result.confirmationRequired).toBe(true);
    expect(supabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expect.stringMatching(
            /\/auth\/confirm\?returnUrl=%2Fallowance%2Finvite%3Ftoken%3Dinvitation$/
          ),
        }),
      })
    );
  });

  it('replaces an unsafe signup return URL with the dashboard', async () => {
    const service = TestBed.inject(AuthService);

    await service.signUp(
      {
        email: 'new@example.com',
        password: 'Password123',
        username: 'new_user',
        fullName: 'New User',
        timezone: 'Europe/Warsaw',
      },
      '//malicious.example/path'
    );

    expect(supabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expect.stringMatching(
            /\/auth\/confirm\?returnUrl=%2Fdashboard$/
          ),
        }),
      })
    );
  });

  it('resends the signup confirmation with the same callback', async () => {
    const service = TestBed.inject(AuthService);

    const result = await service.resendSignupConfirmation(
      'new@example.com',
      '/dashboard'
    );

    expect(result.error).toBeUndefined();
    expect(supabase.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'new@example.com',
      options: {
        emailRedirectTo: expect.stringMatching(
          /\/auth\/confirm\?returnUrl=%2Fdashboard$/
        ),
      },
    });
  });

  it('exchanges an email confirmation code and establishes the session', async () => {
    const session = {
      user: { id: 'new-user', email: 'new@example.com', user_metadata: {} },
    };
    supabase.auth.exchangeCodeForSession.mockResolvedValueOnce({
      data: { session },
      error: null,
    });
    const service = TestBed.inject(AuthService);

    const result = await service.confirmEmailFromUrl(
      'http://localhost:4200/auth/confirm?code=confirmation-code'
    );

    expect(result.error).toBeUndefined();
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith(
      'confirmation-code'
    );
    expect(service.session()).toBe(session);
  });

  it('accepts an implicit confirmation session from the URL fragment', async () => {
    const session = {
      user: { id: 'new-user', email: 'new@example.com', user_metadata: {} },
    };
    supabase.auth.setSession.mockResolvedValueOnce({
      data: { session },
      error: null,
    });
    const service = TestBed.inject(AuthService);

    const result = await service.confirmEmailFromUrl(
      'http://localhost:4200/auth/confirm#access_token=access&refresh_token=refresh'
    );

    expect(result.error).toBeUndefined();
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });

  it('verifies a supported signup token hash', async () => {
    const session = {
      user: { id: 'new-user', email: 'new@example.com', user_metadata: {} },
    };
    supabase.auth.verifyOtp.mockResolvedValueOnce({
      data: { session },
      error: null,
    });
    const service = TestBed.inject(AuthService);

    const result = await service.confirmEmailFromUrl(
      'http://localhost:4200/auth/confirm?token_hash=hash&type=signup'
    );

    expect(result.error).toBeUndefined();
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'hash',
      type: 'signup',
    });
  });

  it('rejects callback errors without exposing provider details', async () => {
    const service = TestBed.inject(AuthService);

    const result = await service.confirmEmailFromUrl(
      'http://localhost:4200/auth/confirm?error=access_denied&error_description=secret'
    );

    expect(result).toEqual({ error: 'invalid_or_expired' });
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('rejects callback URLs without confirmation credentials', async () => {
    supabase.sessionState.current = {
      user: {
        id: 'existing-user',
        email: 'test@example.com',
        user_metadata: {},
      },
    };
    const service = TestBed.inject(AuthService);

    const result = await service.confirmEmailFromUrl(
      'http://localhost:4200/auth/confirm'
    );

    expect(result.error).toBe('invalid_or_expired');
  });
});

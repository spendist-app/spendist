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
      getSession: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: { session: sessionState.current } })
      ),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      setSession: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com', user_metadata: {} } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
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
});

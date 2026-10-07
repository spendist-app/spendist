import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import type { Session } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import { requireAdminGuard } from './admin.guard';
import { SUPABASE_CLIENT } from './supabase';

const session: Session = {
  access_token: 'test-only',
  refresh_token: 'test-only',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'test-user',
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: '',
  },
};

describe('administrator guard', () => {
  const authState = signal<{ loading: boolean; session: Session | null }>({
    loading: false,
    session: null,
  });

  const rpc = vi.fn();

  beforeEach(() => {
    authState.set({ loading: false, session: null });
    rpc.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { authState } },
        { provide: SUPABASE_CLIENT, useValue: { rpc } },
      ],
    });
  });

  async function activate() {
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() =>
      requireAdminGuard(
        new ActivatedRouteSnapshot(),
        router.routerState.snapshot
      )
    );

    if (!(result instanceof Observable))
      throw new Error('Expected asynchronous auth guard');

    TestBed.tick();

    return firstValueFrom(result);
  }

  it('redirects unauthenticated visitors without requesting statistics', async () => {
    const result = await activate();

    expect(result instanceof UrlTree && result.toString()).toBe('/login');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects ordinary users when the server denies access', async () => {
    authState.set({ loading: false, session });
    rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
    const result = await activate();

    expect(result instanceof UrlTree && result.toString()).toBe('/dashboard');
    expect(rpc).toHaveBeenCalledWith('email_admin_status');
  });

  it('allows an administrator only after the server check succeeds', async () => {
    authState.set({ loading: false, session });
    rpc.mockResolvedValue({ data: {}, error: null });

    expect(await activate()).toBe(true);
  });

  it('denies access when the server is unavailable', async () => {
    authState.set({ loading: false, session });
    rpc.mockRejectedValue(new Error('offline'));
    const result = await activate();

    expect(result instanceof UrlTree && result.toString()).toBe('/dashboard');
  });
});

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
import { requirePreviewFeatureGuard } from './feature.guard';
import { FeatureFlagsService } from './feature-flags.service';
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

describe('preview feature guard', () => {
  const authState = signal<{ loading: boolean; session: Session | null }>({
    loading: false,
    session: null,
  });

  const rpc = vi.fn();
  const previewHidden = signal(false);

  beforeEach(() => {
    authState.set({ loading: false, session: null });
    rpc.mockReset();
    previewHidden.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { authState } },
        { provide: SUPABASE_CLIENT, useValue: { rpc } },
        { provide: FeatureFlagsService, useValue: { previewHidden } },
      ],
    });
  });

  async function activate() {
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() =>
      requirePreviewFeatureGuard(
        new ActivatedRouteSnapshot(),
        router.routerState.snapshot
      )
    );

    if (!(result instanceof Observable))
      throw new Error('Expected asynchronous auth guard');

    TestBed.tick();

    return firstValueFrom(result);
  }

  it('redirects unauthenticated visitors to login', async () => {
    const result = await activate();

    expect(result instanceof UrlTree && result.toString()).toBe('/login');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('hides preview modules from ordinary users', async () => {
    authState.set({ loading: false, session });
    rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
    const result = await activate();

    expect(result instanceof UrlTree && result.toString()).toBe('/dashboard');
  });

  it('shows preview modules to administrators', async () => {
    authState.set({ loading: false, session });
    rpc.mockResolvedValue({ data: {}, error: null });

    expect(await activate()).toBe(true);
  });

  it('respects an administrator hiding preview modules', async () => {
    authState.set({ loading: false, session });
    previewHidden.set(true);
    rpc.mockResolvedValue({ data: {}, error: null });
    const result = await activate();

    expect(result instanceof UrlTree && result.toString()).toBe('/dashboard');
    expect(rpc).not.toHaveBeenCalled();
  });
});

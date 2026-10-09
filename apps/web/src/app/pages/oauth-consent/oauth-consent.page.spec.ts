import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TranslocoService } from '@ngneat/transloco';
import { firstValueFrom } from 'rxjs';
import { SUPABASE_CLIENT } from '../../core/supabase';
import { provideAppTransloco } from '../../i18n/transloco.providers';
import { OAuthConsentPageComponent, redirectHost } from './oauth-consent.page';

const details = {
  authorization_id: 'authorization-1',
  redirect_uri: 'https://client.example.test/oauth/callback',
  client: {
    id: 'client-1',
    name: 'Spendist Official Helper',
    uri: 'https://spendist.app',
    logo_uri: '',
  },
  user: { id: 'user-1', email: 'user@example.test' },
  scope: 'email',
};

describe('OAuthConsentPageComponent', () => {
  let fixture: ComponentFixture<OAuthConsentPageComponent>;

  const rpc = vi.fn();

  const oauth = {
    getAuthorizationDetails: vi.fn(),
    approveAuthorization: vi.fn(),
    denyAuthorization: vi.fn(),
  };

  beforeEach(async () => {
    rpc.mockReset().mockResolvedValue({ error: null });
    oauth.getAuthorizationDetails
      .mockReset()
      .mockResolvedValue({ data: details, error: null });
    oauth.approveAuthorization
      .mockReset()
      .mockResolvedValue({ data: null, error: { message: 'stop' } });

    await TestBed.configureTestingModule({
      imports: [OAuthConsentPageComponent],
      providers: [
        provideAppTransloco(),
        { provide: SUPABASE_CLIENT, useValue: { rpc, auth: { oauth } } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({
                authorization_id: 'authorization-1',
              }),
            },
          },
        },
      ],
    }).compileComponents();

    await firstValueFrom(TestBed.inject(TranslocoService).selectTranslation());

    fixture = TestBed.createComponent(OAuthConsentPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  function query(selector: string): HTMLElement | null {
    const root: HTMLElement = fixture.nativeElement;

    return root.querySelector(selector);
  }

  it('shows the redirect host and a third-party warning', () => {
    expect(query('[data-testid="redirect-host"]')?.textContent?.trim()).toBe(
      'client.example.test'
    );
    expect(query('[role="alert"]')?.textContent).toContain(
      'client.example.test'
    );
  });

  it('approves read-only access unless writes are allowed', async () => {
    await fixture.componentInstance.decide('approve');

    expect(rpc).toHaveBeenCalledWith('set_mcp_client_write_access', {
      p_client_id: 'client-1',
      p_allow_write: false,
    });
    expect(oauth.approveAuthorization).toHaveBeenCalledWith(
      'authorization-1',
      { skipBrowserRedirect: true }
    );
  });

  it('records an explicit write grant before approval', async () => {
    query('[data-testid="allow-write"]')?.click();
    await fixture.componentInstance.decide('approve');

    expect(rpc).toHaveBeenCalledWith('set_mcp_client_write_access', {
      p_client_id: 'client-1',
      p_allow_write: true,
    });
  });

  it('does not approve when the write decision cannot be stored', async () => {
    rpc.mockResolvedValue({ error: { message: 'denied' } });

    await fixture.componentInstance.decide('approve');

    expect(oauth.approveAuthorization).not.toHaveBeenCalled();
    expect(fixture.componentInstance.error()).toBe('denied');
  });
});

describe('redirectHost', () => {
  it('extracts the host and rejects invalid URIs', () => {
    expect(redirectHost('http://localhost:3000/callback')).toBe(
      'localhost:3000'
    );
    expect(redirectHost('not a url')).toBeNull();
    expect(redirectHost(undefined)).toBeNull();
  });
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { LegalNotice } from './legal-notice';
import { provideAppTransloco } from '../i18n/transloco.providers';
import { LEGAL_VERSION } from '../pages/legal/legal-content.generated';

class AuthStub {
  readonly session = signal<{
    user: {
      id: string;
      user_metadata: {
        legal_acceptance?: {
          terms_version: string;
          privacy_version: string;
          adult_confirmed: boolean;
          accepted_at: string;
        };
      };
    };
  } | null>(null);
  readonly acceptLegalTerms = vi.fn().mockResolvedValue({});
}

describe('LegalNotice', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LegalNotice],
      providers: [
        AuthStub,
        { provide: AuthService, useExisting: AuthStub },
        provideRouter([]),
        ...provideAppTransloco(),
      ],
    });
  });

  it('shows the notice for a legacy account and hides it after current confirmation', () => {
    const fixture = TestBed.createComponent(LegalNotice);
    const auth = TestBed.inject(AuthStub);
    expect(fixture.componentInstance.visible()).toBe(false);

    auth.session.set({ user: { id: 'user-1', user_metadata: {} } });
    expect(fixture.componentInstance.visible()).toBe(true);

    auth.session.set({
      user: {
        id: 'user-1',
        user_metadata: {
          legal_acceptance: {
            terms_version: LEGAL_VERSION,
            privacy_version: LEGAL_VERSION,
            adult_confirmed: true,
            accepted_at: '2026-09-30T12:00:00.000Z',
          },
        },
      },
    });
    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('requires both declarations and keeps failures visible for retry', async () => {
    const fixture = TestBed.createComponent(LegalNotice);
    const auth = TestBed.inject(AuthStub);
    auth.session.set({ user: { id: 'user-1', user_metadata: {} } });
    fixture.detectChanges();
    const notice = fixture.componentInstance;

    await notice.confirm();
    expect(auth.acceptLegalTerms).not.toHaveBeenCalled();

    notice.form.setValue({ adultConfirmed: true, termsAccepted: false });
    await notice.confirm();
    expect(auth.acceptLegalTerms).not.toHaveBeenCalled();

    auth.acceptLegalTerms.mockResolvedValue({ error: 'Unavailable' });
    notice.form.setValue({ adultConfirmed: true, termsAccepted: true });
    await notice.confirm();
    expect(notice.failed()).toBe(true);
    expect(notice.visible()).toBe(true);
    expect(notice.pending()).toBe(false);

    auth.acceptLegalTerms.mockResolvedValue({});
    await notice.confirm();
    expect(notice.failed()).toBe(false);
  });

  it('resets declarations when the signed-in user changes', () => {
    const fixture = TestBed.createComponent(LegalNotice);
    const auth = TestBed.inject(AuthStub);
    auth.session.set({ user: { id: 'user-1', user_metadata: {} } });
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({
      adultConfirmed: true,
      termsAccepted: true,
    });

    auth.session.set({ user: { id: 'user-2', user_metadata: {} } });
    fixture.detectChanges();

    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      adultConfirmed: false,
      termsAccepted: false,
    });
  });
});

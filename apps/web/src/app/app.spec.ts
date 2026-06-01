import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './core/auth.service';
import { provideAppTransloco } from './i18n/transloco.providers';

class AuthServiceStub {
  private readonly state = signal({
    session: null as unknown,
    loading: false,
  });

  readonly authState = computed(() => this.state());
  readonly session = computed(() => this.authState().session);
  readonly loading = computed(() => this.authState().loading);
  readonly isAuthenticated = computed(() => !!this.session());

  setAuthenticated(isAuthenticated: boolean) {
    this.state.set({
      session: isAuthenticated
        ? ({
            id: 'session',
            user: {
              email: 'test@example.com',
              user_metadata: {},
            },
          } as unknown)
        : null,
      loading: false,
    });
  }
}

describe('App', () => {
  let authStub: AuthServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: AuthService,
          useClass: AuthServiceStub,
        },
        provideRouter([]),
        ...provideAppTransloco(),
      ],
    }).compileComponents();
    authStub = TestBed.inject(AuthService) as AuthServiceStub;
  });

  it('should create app shell', () => {
    const fixture = TestBed.createComponent(App);
    const appInstance = fixture.componentInstance;
    expect(appInstance).toBeTruthy();
  });

  it('should show guest navigation when signed out', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('a[href="/login"]')).toBeTruthy();
    expect(compiled.querySelector('a[href="/signup"]')).toBeTruthy();
  });

  it('should show avatar placeholder when signed in', () => {
    const fixture = TestBed.createComponent(App);
    authStub.setAuthenticated(true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const avatar = compiled.querySelector('.avatar');
    expect(avatar).toBeTruthy();
    expect(compiled.textContent).not.toContain('Log in');
  });
});

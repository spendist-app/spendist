import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
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
      session: isAuthenticated ? ({ id: 'session' } as unknown) : null,
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
    expect(compiled.textContent).toContain('Log in');
    expect(compiled.textContent).toContain('Sign up');
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

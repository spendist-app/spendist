import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './core/auth.service';
import { NavbarComponent } from './core/navbar/navbar.component';
import { NotificationsStore } from './core/notifications/notifications.store';
import { ProfileService } from './core/profile.service';
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

class NotificationsStoreStub {
  readonly loading = signal(false);
  readonly markAllPending = signal(false);
  readonly error = signal<string | null>(null);
  readonly notifications = signal<
    Array<{
      id: string;
      type: string;
      payload: Record<string, unknown>;
      read_at: string | null;
      created_at: string;
    }>
  >([]);
  readonly unreadCount = signal(0);
  readonly hasUnread = signal(false);
  markAllCalls = 0;

  async refresh(): Promise<void> {
    return;
  }

  async markAllAsRead(): Promise<void> {
    this.markAllCalls += 1;
    return;
  }
}

class ProfileServiceStub {
  readonly profile = signal(null);
  readonly avatarUrl = signal<string | null>(null);
}

describe('App', () => {
  let authStub: AuthServiceStub;
  let notificationsStub: NotificationsStoreStub;
  let profileStub: ProfileServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: AuthService,
          useClass: AuthServiceStub,
        },
        {
          provide: NotificationsStore,
          useClass: NotificationsStoreStub,
        },
        {
          provide: ProfileService,
          useClass: ProfileServiceStub,
        },
        provideRouter([]),
        ...provideAppTransloco(),
      ],
    }).compileComponents();
    authStub = TestBed.inject(AuthService) as AuthServiceStub;
    notificationsStub = TestBed.inject(NotificationsStore) as unknown as NotificationsStoreStub;
    profileStub = TestBed.inject(ProfileService) as unknown as ProfileServiceStub;
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
    expect(compiled.querySelector('a[href="/dashboard"]')).toBeFalsy();
    expect(compiled.querySelector('a[href="/transactions"]')).toBeFalsy();
    expect(compiled.querySelector('a[href="/modules/recurring-payments"]')).toBeFalsy();
  });

  it('should switch guest language with accessible flag buttons', async () => {
    const fixture = TestBed.createComponent(App);
    const navbar = fixture.debugElement.query(By.directive(NavbarComponent))
      .componentInstance as NavbarComponent;
    navbar.setLanguage('en');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const languageGroup = compiled.querySelector('[role="group"]');
    const englishButton = languageGroup?.querySelector<HTMLButtonElement>(
      'button[data-language="en"]'
    );
    const polishButton = languageGroup?.querySelector<HTMLButtonElement>(
      'button[data-language="pl"]'
    );

    expect(compiled.querySelector('select')).toBeFalsy();
    expect(languageGroup?.hasAttribute('aria-label')).toBe(true);
    expect(englishButton?.hasAttribute('aria-label')).toBe(true);
    expect(polishButton?.hasAttribute('aria-label')).toBe(true);
    expect(englishButton?.getAttribute('aria-pressed')).toBe('true');
    expect(polishButton?.getAttribute('aria-pressed')).toBe('false');

    polishButton?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(polishButton?.getAttribute('aria-pressed')).toBe('true');
    expect(compiled.querySelector('a[href="/pl/blog"]')).toBeTruthy();
    expect(document.documentElement.lang).toBe('pl');
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

  it('should show profile avatar image in the navbar when available', () => {
    const fixture = TestBed.createComponent(App);
    authStub.setAuthenticated(true);
    profileStub.avatarUrl.set('https://cdn.example.test/avatar.png?v=1');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const avatarImage = compiled.querySelector<HTMLImageElement>(
      '.avatar img'
    );

    expect(avatarImage?.src).toBe('https://cdn.example.test/avatar.png?v=1');
  });

  it('should show notification bell when signed in', () => {
    const fixture = TestBed.createComponent(App);
    authStub.setAuthenticated(true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-notifications-menu')).toBeTruthy();
    expect(compiled.querySelector('app-notifications-menu button.btn-circle')).toBeTruthy();
  });

  it('should show unread notification badge', () => {
    const fixture = TestBed.createComponent(App);
    authStub.setAuthenticated(true);
    notificationsStub.unreadCount.set(3);
    notificationsStub.hasUnread.set(true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.badge-primary')?.textContent?.trim()).toBe('3');
  });

  it('should show notification empty state', () => {
    const fixture = TestBed.createComponent(App);
    authStub.setAuthenticated(true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-notifications-menu .text-center')).toBeTruthy();
  });

  it('should show build commit in about dialog', () => {
    const fixture = TestBed.createComponent(App);
    authStub.setAuthenticated(true);
    fixture.detectChanges();

    const navbar = fixture.debugElement.query(By.directive(NavbarComponent))
      .componentInstance as NavbarComponent;
    navbar.openAboutModal();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const dialog = compiled.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.textContent).toContain(navbar.buildCommitShort);
  });

  it('should mark all notifications as read from the popup', () => {
    const fixture = TestBed.createComponent(App);
    authStub.setAuthenticated(true);
    notificationsStub.notifications.set([
      {
        id: 'notification-1',
        type: 'recurring_transaction_created',
        payload: {
          description: 'Rent',
          amount: 1200,
          currency: 'PLN',
        },
        read_at: null,
        created_at: '2026-06-02T20:00:00.000Z',
      },
    ]);
    notificationsStub.unreadCount.set(1);
    notificationsStub.hasUnread.set(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const readAllButton = compiled.querySelector('app-notifications-menu button.btn-xs') as HTMLButtonElement | null;
    readAllButton?.click();

    expect(notificationsStub.markAllCalls).toBe(1);
  });
});

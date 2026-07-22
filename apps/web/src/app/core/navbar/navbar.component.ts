import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { AuthService } from '../auth.service';
import { LanguageService } from '../language.service';
import { NotificationsMenuComponent } from '../notifications/notifications-menu.component';
import { ProfileService } from '../profile.service';
import { ThemeService } from '../theme.service';
import { appInfoConfig } from '../../config/app-info.config';

@Component({
  standalone: true,
  selector: 'app-navbar',
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslocoPipe,
    NotificationsMenuComponent,
  ],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);

  readonly modulesMenuOpen = signal(false);
  readonly accountMenuOpen = signal(false);
  readonly aboutModalOpen = signal(false);
  readonly languages = this.languageService.availableLanguages;
  readonly activeLanguage = computed(() =>
    this.languageService.currentLanguage()
  );
  readonly blogLink = computed(() => `/${this.activeLanguage()}/blog`);
  readonly buildCommit = appInfoConfig.buildCommit;
  readonly buildCommitShort = shortCommit(appInfoConfig.buildCommit);
  readonly avatarUrl = computed(() => this.profileService.avatarUrl());
  private modulesCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private accountCloseTimer: ReturnType<typeof setTimeout> | null = null;

  readonly initials = computed(() => {
    const profile = this.profileService.profile();
    if (profile) {
      return resolveInitials(profile.fullName || profile.username);
    }

    const session = this.auth.session();
    const metadata = (session?.user.user_metadata ?? {}) as Record<
      string,
      unknown
    >;
    const rawFullName = metadata['full_name'];
    const nameCandidate =
      typeof rawFullName === 'string' && rawFullName.trim().length
        ? rawFullName
        : session?.user.email ?? '';
    return resolveInitials(nameCandidate);
  });

  readonly isDark = computed(
    () => this.themeService.theme() === 'spendistDark'
  );
  readonly currentThemeLabel = computed(() =>
    this.isDark() ? 'common.theme.dark' : 'common.theme.light'
  );
  readonly themeToggleLabel = computed(() =>
    this.isDark() ? 'common.theme.useLight' : 'common.theme.useDark'
  );

  openModulesMenu(): void {
    this.cancelModulesClose();
    this.modulesMenuOpen.set(true);
  }

  closeModulesMenu(): void {
    this.cancelModulesClose();
    this.modulesMenuOpen.set(false);
  }

  scheduleCloseModulesMenu(): void {
    this.cancelModulesClose();
    this.modulesCloseTimer = setTimeout(() => {
      this.modulesMenuOpen.set(false);
      this.modulesCloseTimer = null;
    }, 180);
  }

  toggleModulesMenu(): void {
    this.cancelModulesClose();
    this.modulesMenuOpen.update((open) => !open);
  }

  closeAccountMenu(): void {
    this.cancelAccountClose();
    this.accountMenuOpen.set(false);
  }

  openAboutModal(): void {
    this.closeAccountMenu();
    this.closeModulesMenu();
    this.aboutModalOpen.set(true);
  }

  closeAboutModal(): void {
    this.aboutModalOpen.set(false);
  }

  scheduleCloseAccountMenu(): void {
    this.cancelAccountClose();
    this.accountCloseTimer = setTimeout(() => {
      this.accountMenuOpen.set(false);
      this.accountCloseTimer = null;
    }, 180);
  }

  toggleAccountMenu(): void {
    this.cancelAccountClose();
    this.accountMenuOpen.update((open) => !open);
  }

  handleModulesFocusOut(event: FocusEvent): void {
    const nextElement = event.relatedTarget as HTMLElement | null;
    const currentTarget = event.currentTarget as HTMLElement | null;
    if (!currentTarget) {
      this.closeModulesMenu();
      return;
    }

    if (!nextElement || !currentTarget.contains(nextElement)) {
      this.scheduleCloseModulesMenu();
    }
  }

  handleAccountFocusOut(event: FocusEvent): void {
    const nextElement = event.relatedTarget as HTMLElement | null;
    const currentTarget = event.currentTarget as HTMLElement | null;
    if (!currentTarget) {
      this.closeAccountMenu();
      return;
    }

    if (!nextElement || !currentTarget.contains(nextElement)) {
      this.scheduleCloseAccountMenu();
    }
  }

  private cancelModulesClose(): void {
    if (!this.modulesCloseTimer) {
      return;
    }

    clearTimeout(this.modulesCloseTimer);
    this.modulesCloseTimer = null;
  }

  private cancelAccountClose(): void {
    if (!this.accountCloseTimer) {
      return;
    }

    clearTimeout(this.accountCloseTimer);
    this.accountCloseTimer = null;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
    this.closeAccountMenu();
  }

  async signOut(): Promise<void> {
    this.closeAccountMenu();
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }

  onLanguageChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const next = (target?.value ?? '') as Parameters<
      LanguageService['setLanguage']
    >[0];
    if (next) {
      this.languageService.setLanguage(next);
      if (/^\/(pl|en)\/blog(?:\/|$)/.test(this.router.url)) {
        void this.router.navigateByUrl(`/${next}/blog`);
      }
    }
  }
}

function resolveInitials(nameCandidate: string): string {
  if (!nameCandidate) {
    return 'U';
  }

  const parts = nameCandidate.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function shortCommit(commit: string): string {
  const normalized = commit.trim();
  if (!normalized || normalized === 'unknown') {
    return 'unknown';
  }

  return normalized.slice(0, 12);
}

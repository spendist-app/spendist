import { z } from 'zod';
import {
  Component,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { AdminAccessService } from '../admin-access.service';
import { AuthService } from '../auth.service';
import { LanguageService } from '../language.service';
import { NotificationsMenuComponent } from '../notifications/notifications-menu.component';
import { ProfileService } from '../profile.service';
import { ThemeService } from '../theme.service';
import { appInfoConfig } from '../../config/app-info.config';
import type { LanguageCode } from '../../i18n/languages';

@Component({
  standalone: true,
  selector: 'app-navbar',
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslocoPipe,
    NotificationsMenuComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly adminAccess = inject(AdminAccessService);
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

    const fullName = z
      .string()
      .refine((value) => value.trim().length > 0)
      .safeParse(session?.user.user_metadata['full_name']);

    const nameCandidate = fullName.success
      ? fullName.data
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
    const nextElement =
      event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null;

    const currentTarget =
      event.currentTarget instanceof HTMLElement ? event.currentTarget : null;

    if (!currentTarget) {
      this.closeModulesMenu();

      return;
    }

    if (!nextElement || !currentTarget.contains(nextElement)) {
      this.scheduleCloseModulesMenu();
    }
  }

  handleAccountFocusOut(event: FocusEvent): void {
    const nextElement =
      event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null;

    const currentTarget =
      event.currentTarget instanceof HTMLElement ? event.currentTarget : null;

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

  setLanguage(language: LanguageCode): void {
    this.languageService.setLanguage(language);

    if (/^\/(pl|en)\/blog(?:\/|$)/.test(this.router.url)) {
      void this.router.navigateByUrl(`/${language}/blog`);
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

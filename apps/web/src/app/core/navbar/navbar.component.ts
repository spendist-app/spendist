import { z } from 'zod';
import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { AdminAccessService } from '../admin-access.service';
import { AuthService } from '../auth.service';
import { FeatureFlagsService } from '../feature-flags.service';
import { GlobalNoticeService } from '../global-notice.service';
import { InstallAppService } from '../install-app.service';
import { LanguageService } from '../language.service';
import { NotificationsMenuComponent } from '../notifications/notifications-menu.component';
import { ProfileService } from '../profile.service';
import { PopoverMenuDirective } from '../../shared/popover-menu/popover-menu.directive';
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
    PopoverMenuDirective,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly adminAccess = inject(AdminAccessService);
  readonly featureFlags = inject(FeatureFlagsService);
  readonly installApp = inject(InstallAppService);
  private readonly notices = inject(GlobalNoticeService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);

  readonly aboutModalOpen = signal(false);
  private readonly aboutDialog =
    viewChild<ElementRef<HTMLDialogElement>>('aboutDialog');
  readonly languages = this.languageService.availableLanguages;
  readonly activeLanguage = computed(() =>
    this.languageService.currentLanguage()
  );
  readonly blogLink = computed(() => `/${this.activeLanguage()}/blog`);
  readonly buildCommit = appInfoConfig.buildCommit;
  readonly buildCommitShort = shortCommit(appInfoConfig.buildCommit);
  readonly avatarUrl = computed(() => this.profileService.avatarUrl());

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

  constructor() {
    // Runs only in the browser. The native modal makes the page inert,
    // handles Esc and the back gesture, and returns focus on close.
    afterRenderEffect(() => {
      const dialog = this.aboutDialog()?.nativeElement;

      if (
        dialog &&
        'showModal' in HTMLDialogElement.prototype &&
        !dialog.open
      ) {
        dialog.showModal();
      }
    });
  }

  readonly isDark = computed(
    () => this.themeService.theme() === 'spendistDark'
  );
  readonly currentThemeLabel = computed(() => {
    if (this.themeService.followsSystem()) {
      return this.isDark()
        ? 'common.theme.systemDark'
        : 'common.theme.systemLight';
    }

    return this.isDark() ? 'common.theme.dark' : 'common.theme.light';
  });
  readonly themeToggleLabel = computed(() =>
    this.isDark() ? 'common.theme.useLight' : 'common.theme.useDark'
  );

  openAboutModal(): void {
    this.aboutModalOpen.set(true);
  }

  closeAboutModal(): void {
    const dialog = this.aboutDialog()?.nativeElement;

    if (dialog?.open) {
      // The dialog's close event finishes closing the modal.
      dialog.close();

      return;
    }

    this.aboutModalOpen.set(false);
  }

  protected onAboutDialogClosed(): void {
    this.aboutModalOpen.set(false);
  }

  async installAppFromMenu(): Promise<void> {
    const outcome = await this.installApp.install();

    if (outcome === 'installed') {
      this.notices.showSuccess('navbar.install.success');
    } else if (outcome === 'failed') {
      this.notices.showInfo('navbar.install.failed');
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  async signOut(): Promise<void> {
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

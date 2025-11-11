import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { AuthService } from '../auth.service';
import { LanguageService } from '../language.service';
import { ThemeService } from '../theme.service';

@Component({
  standalone: true,
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, TranslocoPipe],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);

  readonly modulesMenuOpen = signal(false);
  readonly languages = this.languageService.availableLanguages;
  readonly activeLanguage = computed(() => this.languageService.currentLanguage());

  readonly initials = computed(() => {
    const session = this.auth.session();
    const metadata = (session?.user.user_metadata ?? {}) as Record<string, unknown>;
    const rawFullName = metadata['full_name'];
    const nameCandidate = typeof rawFullName === 'string' && rawFullName.trim().length
      ? rawFullName
      : session?.user.email ?? '';
    if (!nameCandidate) {
      return 'U';
    }

    const parts = nameCandidate.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  });

  readonly isDark = computed(() => this.themeService.theme() === 'spendistDark');
  readonly currentThemeLabel = computed(() => (this.isDark() ? 'common.theme.dark' : 'common.theme.light'));
  readonly themeToggleLabel = computed(() =>
    this.isDark() ? 'common.theme.useLight' : 'common.theme.useDark'
  );

  openModulesMenu(): void {
    this.modulesMenuOpen.set(true);
  }

  closeModulesMenu(): void {
    this.modulesMenuOpen.set(false);
  }

  toggleModulesMenu(): void {
    this.modulesMenuOpen.update((open) => !open);
  }

  handleModulesFocusOut(event: FocusEvent): void {
    const nextElement = event.relatedTarget as HTMLElement | null;
    const currentTarget = event.currentTarget as HTMLElement | null;
    if (!currentTarget) {
      this.closeModulesMenu();
      return;
    }

    if (!nextElement || !currentTarget.contains(nextElement)) {
      this.closeModulesMenu();
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }

  onLanguageChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const next = (target?.value ?? '') as Parameters<LanguageService['setLanguage']>[0];
    if (next) {
      this.languageService.setLanguage(next);
    }
  }
}

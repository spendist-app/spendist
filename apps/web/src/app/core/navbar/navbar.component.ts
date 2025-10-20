import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { AuthService } from '../auth.service';
import { LanguageService } from '../language.service';
import { ThemeService } from '../theme.service';

@Component({
  standalone: true,
  selector: 'app-navbar',
  imports: [RouterLink, TranslocoPipe],
  template: `
    <nav class="navbar bg-base-100/80 backdrop-blur shadow-sm">
      <div class="flex-1">
        <a class="btn btn-ghost text-xl normal-case" routerLink="/">
          {{ 'common.appName' | transloco }}
        </a>
      </div>
      <div class="flex items-center gap-3">
        <label class="sr-only" for="language-selector">
          {{ 'common.language.label' | transloco }}
        </label>
        <select
          id="language-selector"
          class="select select-bordered select-sm"
          [value]="activeLanguage()"
          (change)="onLanguageChange($event)"
        >
          @for (language of languages; track language.code) {
            <option [value]="language.code">
              {{ language.labelKey | transloco }}
            </option>
          }
        </select>
      </div>
      <div class="flex-none">
        @if (auth.loading()) {
          <span
            class="loading loading-spinner loading-md text-primary"
            [attr.aria-label]="'common.status.checkingSession' | transloco"
          ></span>
        } @else {
          @if (auth.isAuthenticated()) {
            <div class="dropdown dropdown-end md:dropdown-hover">
              <button
                tabindex="0"
                type="button"
                aria-haspopup="menu"
                class="btn btn-ghost btn-circle avatar placeholder"
                [attr.aria-label]="'navbar.settings' | transloco"
              >
                <div class="bg-neutral text-neutral-content w-10 rounded-full">
                  <span class="text-lg font-semibold uppercase">{{ initials() }}</span>
                </div>
              </button>
              <ul
                tabindex="0"
                role="menu"
                class="menu menu-sm dropdown-content mt-3 w-56 rounded-box bg-base-100 p-2 shadow-lg"
              >
                <li>
                  <button type="button" (click)="toggleTheme()" role="menuitem">
                    <span class="flex items-center justify-between">
                      <span>{{ themeToggleLabel() | transloco }}</span>
                      <span class="badge badge-ghost text-xs">
                        {{ currentThemeLabel() | transloco }}
                      </span>
                    </span>
                  </button>
                </li>
                <li>
                  <a routerLink="/settings" role="menuitem">
                    {{ 'navbar.settings' | transloco }}
                  </a>
                </li>
                <li>
                  <button type="button" (click)="signOut()" role="menuitem">
                    {{ 'navbar.signOut' | transloco }}
                  </button>
                </li>
              </ul>
            </div>
          } @else {
            <div class="flex items-center gap-2">
              <a class="btn btn-ghost" routerLink="/login">{{ 'common.actions.login' | transloco }}</a>
              <a class="btn btn-primary" routerLink="/signup">{{ 'common.actions.signup' | transloco }}</a>
            </div>
          }
        }
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);

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

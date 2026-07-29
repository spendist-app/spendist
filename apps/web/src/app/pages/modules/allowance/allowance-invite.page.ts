import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { AuthService } from '../../../core/auth.service';
import { AllowanceService } from './allowance.service';

const TOKEN_STORAGE_KEY = 'spendist.allowanceInvitationToken';

@Component({
  standalone: true,
  selector: 'app-allowance-invite-page',
  imports: [RouterLink, TranslocoPipe],
  providers: [AllowanceService],
  template: `
    <main class="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-10">
      <section class="card w-full border border-base-200 bg-base-100 shadow-xl">
        <div class="card-body items-center text-center">
          <span class="badge badge-primary badge-outline">
            {{ 'modules.allowance.badge' | transloco }}
          </span>
          <h1 class="card-title text-3xl">
            {{ 'modules.allowance.invitePage.title' | transloco }}
          </h1>
          <p class="text-base-content/70">
            {{ 'modules.allowance.ledgerNotice' | transloco }}
          </p>
          @if (working()) {
            <span class="loading loading-spinner loading-lg text-primary"></span>
          } @else if (accepted()) {
            <div class="alert alert-success">
              {{ 'modules.allowance.invitePage.accepted' | transloco }}
            </div>
            <a class="btn btn-primary" routerLink="/modules/allowance">
              {{ 'modules.allowance.invitePage.open' | transloco }}
            </a>
          } @else if (auth.isAuthenticated()) {
            <div class="alert alert-error">
              {{ 'modules.allowance.invitePage.invalid' | transloco }}
            </div>
          } @else {
            <p>{{ 'modules.allowance.invitePage.signIn' | transloco }}</p>
            <div class="card-actions">
              <a class="btn btn-outline" [routerLink]="['/login']"
                [queryParams]="{ returnUrl: '/allowance/invite' }">
                {{ 'common.actions.login' | transloco }}
              </a>
              <a class="btn btn-primary" [routerLink]="['/signup']"
                [queryParams]="{ returnUrl: '/allowance/invite' }">
                {{ 'common.actions.signup' | transloco }}
              </a>
            </div>
          }
        </div>
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllowanceInvitePageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly allowance = inject(AllowanceService);
  private readonly router = inject(Router);
  readonly working = signal(false);
  readonly accepted = signal(false);
  private readonly attempted = signal(false);

  private readonly sessionEffect = effect(() => {
    if (this.auth.isAuthenticated() && !this.attempted()) {
      void this.acceptStoredToken();
    }
  });

  ngOnInit(): void {
    const fragmentToken = this.readFragmentToken();
    if (fragmentToken) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, fragmentToken);
      void this.router.navigate([], { fragment: undefined, replaceUrl: true });
    }
    if (this.auth.isAuthenticated()) {
      void this.acceptStoredToken();
    }
  }

  private async acceptStoredToken(): Promise<void> {
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;
    this.attempted.set(true);
    this.working.set(true);
    const success = await this.allowance.acceptToken(token);
    this.working.set(false);
    this.accepted.set(success);
    if (success) sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  private readFragmentToken(): string | null {
    const fragment = globalThis.location?.hash.replace(/^#/, '') ?? '';
    const token = new URLSearchParams(fragment).get('token');
    return token && /^[a-f0-9]{64}$/i.test(token) ? token : null;
  }
}

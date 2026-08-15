import { inject } from '@angular/core';
import { ResolveFn, Route } from '@angular/router';
import { TranslocoService } from '@ngneat/transloco';
import { firstValueFrom } from 'rxjs';
import {
  redirectAuthenticatedToHomeGuard,
  requireAuthGuard,
  requireAuthWithReturnUrlGuard,
} from './core/auth.guard';
import { LanguageService } from './core/language.service';

export const appRoutes: Route[] = [
  {
    path: '',
    canActivate: [redirectAuthenticatedToHomeGuard],
    loadComponent: () =>
      import('./pages/landing/landing.page').then(
        (m) => m.LandingPageComponent
      ),
  },
  ...blogRoutes('pl'),
  ...blogRoutes('en'),
  {
    path: 'dashboard',
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then(
        (m) => m.DashboardPageComponent
      ),
  },
  {
    path: 'home',
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('./pages/home/home.page').then((m) => m.HomePageComponent),
  },
  {
    path: 'transactions',
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('./pages/transactions/transactions.page').then(
        (m) => m.TransactionsPageComponent
      ),
  },
  {
    path: 'login',
    canActivate: [redirectAuthenticatedToHomeGuard],
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'forgot-password',
    canActivate: [redirectAuthenticatedToHomeGuard],
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then(
        (m) => m.ForgotPasswordPageComponent
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.page').then(
        (m) => m.ResetPasswordPageComponent
      ),
  },
  {
    path: 'auth/confirm',
    loadComponent: () =>
      import('./pages/auth-confirm/auth-confirm.page').then(
        (m) => m.AuthConfirmPageComponent
      ),
  },
  {
    path: 'signup',
    canActivate: [redirectAuthenticatedToHomeGuard],
    loadComponent: () =>
      import('./pages/signup/signup.page').then((m) => m.SignupPageComponent),
  },
  {
    path: 'settings/connected-apps',
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('./pages/connected-apps/connected-apps.page').then(
        (m) => m.ConnectedAppsPageComponent
      ),
  },
  {
    path: 'oauth/consent',
    canActivate: [requireAuthWithReturnUrlGuard],
    loadComponent: () =>
      import('./pages/oauth-consent/oauth-consent.page').then(
        (m) => m.OAuthConsentPageComponent
      ),
  },
  {
    path: 'settings',
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('./pages/settings/settings.page').then(
        (m) => m.SettingsPageComponent
      ),
  },
  {
    path: 'modules/recurring-payments',
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('./pages/modules/recurring-payments/recurring-payments.page').then(
        (m) => m.RecurringPaymentsPageComponent
      ),
  },
  {
    path: 'modules/mortgages',
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('./pages/modules/mortgages/mortgages.page').then(
        (m) => m.MortgagesPage
      ),
  },
  {
    path: 'modules/places',
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('./pages/modules/places/places.page').then(
        (m) => m.PlacesPageComponent
      ),
  },
  {
    path: 'modules/allowance',
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('./pages/modules/allowance/allowance.page').then(
        (m) => m.AllowancePageComponent
      ),
  },
  {
    path: 'allowance/invite',
    loadComponent: () =>
      import('./pages/modules/allowance/allowance-invite.page').then(
        (m) => m.AllowanceInvitePageComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

function blogRoutes(locale: 'pl' | 'en'): Route[] {
  const data = { blogLocale: locale } as const;
  const resolve = { blogLanguage: resolveBlogLanguage(locale) };
  const loadIndex = () =>
    import('./pages/blog/blog-index').then((m) => m.BlogIndex);
  const loadArticle = () =>
    import('./pages/blog/blog-article').then((m) => m.BlogArticle);
  const loadNotFound = () =>
    import('./pages/blog/blog-not-found').then((m) => m.BlogNotFound);
  return [
    { path: `${locale}/blog`, data, resolve, loadComponent: loadIndex },
    {
      path: `${locale}/blog/page/:page`,
      data,
      resolve,
      loadComponent: loadIndex,
    },
    {
      path: `${locale}/blog/category/:categorySlug/page/:page`,
      data,
      resolve,
      loadComponent: loadIndex,
    },
    {
      path: `${locale}/blog/category/:categorySlug`,
      data,
      resolve,
      loadComponent: loadIndex,
    },
    { path: `${locale}/blog/:slug`, data, resolve, loadComponent: loadArticle },
    {
      path: `${locale}/blog-not-found`,
      data,
      resolve,
      loadComponent: loadNotFound,
    },
  ];
}

function resolveBlogLanguage(locale: 'pl' | 'en'): ResolveFn<boolean> {
  return async () => {
    const language = inject(LanguageService);
    const transloco = inject(TranslocoService);
    language.setLanguage(locale);
    await firstValueFrom(transloco.load(locale));
    return true;
  };
}

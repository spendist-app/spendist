import { Route } from '@angular/router';
import { redirectAuthenticatedToHomeGuard, requireAuthGuard } from './core/auth.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    canActivate: [redirectAuthenticatedToHomeGuard],
    loadComponent: () =>
      import('./pages/landing/landing.page').then((m) => m.LandingPageComponent),
  },
  {
    path: 'dashboard',
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPageComponent),
  },
  {
    path: 'home',
    canActivate: [requireAuthGuard],
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePageComponent),
  },
  {
    path: 'transactions',
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('./pages/transactions/transactions.page').then((m) => m.TransactionsPageComponent),
  },
  {
    path: 'login',
    canActivate: [redirectAuthenticatedToHomeGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'signup',
    canActivate: [redirectAuthenticatedToHomeGuard],
    loadComponent: () => import('./pages/signup/signup.page').then((m) => m.SignupPageComponent),
  },
  {
    path: 'settings',
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('./pages/settings/settings.page').then((m) => m.SettingsPageComponent),
  },
  {
    path: 'modules/recurring-payments',
    canActivate: [requireAuthGuard],
    loadComponent: () =>
      import('./pages/modules/recurring-payments/recurring-payments.page').then(
        (m) => m.RecurringPaymentsPageComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

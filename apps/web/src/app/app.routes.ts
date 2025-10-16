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
    path: 'home',
    canActivate: [requireAuthGuard],
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePageComponent),
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
    path: '**',
    redirectTo: '',
  },
];

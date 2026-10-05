import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppUpdateNotification } from './core/app-update-notification';
import { GlobalNotice } from './core/global-notice';
import { NavbarComponent } from './core/navbar/navbar.component';
import { LegalNotice } from './core/legal-notice';
import { AnalyticsConsent } from './core/analytics-consent';

@Component({
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarComponent,
    AppUpdateNotification,
    GlobalNotice,
    LegalNotice,
    AnalyticsConsent,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.css',
})
export class App {}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { LanguageService } from './language.service';
import { PublicAnalyticsService } from './public-analytics.service';

@Component({
  selector: 'app-analytics-consent',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './analytics-consent.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsConsent {
  readonly analytics = inject(PublicAnalyticsService);
  readonly language = inject(LanguageService);
}

import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { NgIcon } from '@ng-icons/core';
import {
  heroArrowDownTray,
  heroArrowPathRoundedSquare,
  heroArrowsRightLeft,
  heroBell,
  heroChartBarSquare,
  heroCheckCircle,
  heroCodeBracket,
  heroMapPin,
  heroShieldCheck,
  heroSparkles,
  heroTableCells,
  heroTag,
} from '@ng-icons/heroicons/outline';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';

@Component({
  standalone: true,
  selector: 'app-landing-page',
  imports: [RouterLink, TranslocoPipe, NgIcon],
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.css',
})
export class LandingPageComponent {
  readonly auth = inject(AuthService);
  private readonly language = inject(LanguageService);
  protected readonly blogLink = computed(
    () => `/${this.language.currentLanguage()}/blog`
  );
  protected readonly sparklesIcon = heroSparkles;
  protected readonly checkIcon = heroCheckCircle;
  protected readonly chartIcon = heroChartBarSquare;
  protected readonly bulkIcon = heroTableCells;
  protected readonly recurringIcon = heroArrowPathRoundedSquare;
  protected readonly currencyIcon = heroArrowsRightLeft;
  protected readonly importIcon = heroArrowDownTray;
  protected readonly tagIcon = heroTag;
  protected readonly placeIcon = heroMapPin;
  protected readonly bellIcon = heroBell;
  protected readonly codeIcon = heroCodeBracket;
  protected readonly shieldIcon = heroShieldCheck;
}

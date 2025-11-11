import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@ngneat/transloco';
import { LanguageService } from '../../core/language.service';
import type { LanguageCode } from '../../i18n/languages';
import { DashboardStore } from './dashboard.store';

@Component({
  standalone: true,
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  providers: [DashboardStore],
  templateUrl: './dashboard.page.html',
})
export class DashboardPageComponent {
  protected readonly store = inject(DashboardStore);
  protected readonly skeletonPlaceholders = Array.from({ length: 4 }, (_, index) => index);

  private readonly languageService = inject(LanguageService);
  private readonly locale = computed(() => this.resolveLocale(this.languageService.currentLanguage()));

  protected formatMonth(date: Date): string {
    return new Intl.DateTimeFormat(this.locale(), {
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  protected formatIncome(value: number): string {
    return `+${this.formatMagnitude(value)}`;
  }

  protected formatExpense(value: number): string {
    return `-${this.formatMagnitude(value)}`;
  }

  protected formatNet(value: number): string {
    if (value === 0) {
      return this.formatMagnitude(0);
    }

    const prefix = value > 0 ? '+' : '-';
    return `${prefix}${this.formatMagnitude(Math.abs(value))}`;
  }

  protected onWalletChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    if (!select) {
      return;
    }

    this.store.selectWallet(select.value);
  }

  protected onMonthChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    if (!select) {
      return;
    }

    this.store.selectMonth(select.value);
  }

  private formatMagnitude(value: number): string {
    return new Intl.NumberFormat(this.locale(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private resolveLocale(language: LanguageCode): string {
    switch (language) {
      case 'pl':
        return 'pl-PL';
      case 'en':
      default:
        return 'en-US';
    }
  }
}

import { Component, computed, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { heroBell } from '@ng-icons/heroicons/outline';
import { TranslocoPipe } from '@ngneat/transloco';
import type { NotificationRow } from '@spendist/data-access/supabase-types';
import { NotificationsStore } from './notifications.store';

interface RecurringTransactionNotificationPayload {
  readonly description?: unknown;
  readonly amount?: unknown;
  readonly currency?: unknown;
  readonly end_date?: unknown;
}

@Component({
  standalone: true,
  selector: 'app-notifications-menu',
  imports: [NgIcon, TranslocoPipe],
  templateUrl: './notifications-menu.component.html',
})
export class NotificationsMenuComponent {
  readonly store = inject(NotificationsStore);
  readonly bellIcon = heroBell;
  readonly unreadLabel = computed(() => {
    const count = this.store.unreadCount();
    return count > 99 ? '99+' : `${count}`;
  });

  async markAllAsRead(): Promise<void> {
    await this.store.markAllAsRead();
  }

  async refresh(): Promise<void> {
    await this.store.refresh();
  }

  notificationTitle(notification: NotificationRow): string {
    return `notifications.items.${notification.type}.title`;
  }

  notificationParams(notification: NotificationRow): Record<string, string> {
    const payload = notification.payload as RecurringTransactionNotificationPayload | null;
    return {
      description: this.stringify(payload?.description, ''),
      amount: this.stringify(payload?.amount, ''),
      currency: this.stringify(payload?.currency, ''),
      endDate: this.stringify(payload?.end_date, ''),
    };
  }

  formatCreatedAt(notification: NotificationRow): string {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(notification.created_at));
  }

  private stringify(value: unknown, fallback: string): string {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }

    if (typeof value === 'number') {
      return `${value}`;
    }

    return fallback;
  }
}

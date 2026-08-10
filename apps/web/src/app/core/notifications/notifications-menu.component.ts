import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
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
  readonly error?: unknown;
  readonly invitation_id?: unknown;
  readonly inviter_name?: unknown;
  readonly recipient_name?: unknown;
}

@Component({
  standalone: true,
  selector: 'app-notifications-menu',
  imports: [NgIcon, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.Eager,
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
      error: this.stringify(payload?.error, ''),
      inviterName: this.stringify(payload?.inviter_name, ''),
      recipientName: this.stringify(payload?.recipient_name, ''),
    };
  }

  isAllowanceInvitation(notification: NotificationRow): boolean {
    return notification.type === 'allowance_invitation_received';
  }

  async respondToInvitation(
    notification: NotificationRow,
    accept: boolean
  ): Promise<void> {
    const payload =
      notification.payload as RecurringTransactionNotificationPayload | null;
    const invitationId = this.stringify(payload?.invitation_id, '');
    if (!invitationId) return;
    const success = await this.store.respondToAllowanceInvitation(
      invitationId,
      accept
    );
    if (success) await this.store.refresh();
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

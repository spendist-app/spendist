import { z } from 'zod';
import {
  Component,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { heroBell, heroCheck } from '@ng-icons/heroicons/outline';
import { TranslocoPipe } from '@ngneat/transloco';
import type { NotificationRow } from '@spendist/data-access/supabase-types';
import { NotificationsStore } from './notifications.store';

const notificationPayload = z.object({
  description: z.unknown(),
  amount: z.unknown(),
  currency: z.unknown(),
  end_date: z.unknown(),
  error: z.unknown(),
  invitation_id: z.unknown(),
  inviter_name: z.unknown(),
  payer_name: z.unknown(),
  recipient_name: z.unknown(),
});

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
  readonly markReadIcon = heroCheck;
  readonly unreadLabel = computed(() => {
    const count = this.store.unreadCount();

    return count > 99 ? '99+' : `${count}`;
  });

  async markAllAsRead(): Promise<void> {
    await this.store.markAllAsRead();
  }

  async markAsRead(notification: NotificationRow): Promise<void> {
    await this.store.markAsRead(notification.id);
  }

  async refresh(): Promise<void> {
    await this.store.refresh();
  }

  notificationTitle(notification: NotificationRow): string {
    return `notifications.items.${notification.type}.title`;
  }

  notificationParams(notification: NotificationRow) {
    const parsed = notificationPayload.safeParse(notification.payload);
    const payload = parsed.success ? parsed.data : null;

    return {
      description: this.stringify(payload?.description, ''),
      amount: this.stringify(payload?.amount, ''),
      currency: this.stringify(payload?.currency, ''),
      endDate: this.stringify(payload?.end_date, ''),
      error: this.stringify(payload?.error, ''),
      inviterName: this.stringify(payload?.inviter_name, ''),
      payerName: this.stringify(payload?.payer_name, ''),
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
    const parsed = notificationPayload.safeParse(notification.payload);
    const payload = parsed.success ? parsed.data : null;

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

  private stringify<T>(value: T, fallback: string): string {
    const parsed = z
      .union([z.string().refine((text) => text.trim().length > 0), z.number()])
      .safeParse(value);

    return parsed.success ? String(parsed.data) : fallback;
  }
}

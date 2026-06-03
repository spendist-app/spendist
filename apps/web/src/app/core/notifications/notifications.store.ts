import { EnvironmentInjector, Injectable, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import type { NotificationRow } from '@spendist/data-access/supabase-types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../auth.service';
import { SUPABASE_CLIENT } from '../supabase';

const NOTIFICATIONS_LIMIT = 20;

interface NotificationsState {
  readonly loading: boolean;
  readonly markAllPending: boolean;
  readonly error: string | null;
  readonly notifications: readonly NotificationRow[];
}

@Injectable({
  providedIn: 'root',
})
export class NotificationsStore implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly environmentInjector = inject(EnvironmentInjector);

  private readonly state = signal<NotificationsState>({
    loading: false,
    markAllPending: false,
    error: null,
    notifications: [],
  });

  private channel: RealtimeChannel | null = null;
  private activeUserId: string | null = null;

  readonly loading = computed(() => this.state().loading);
  readonly markAllPending = computed(() => this.state().markAllPending);
  readonly error = computed(() => this.state().error);
  readonly notifications = computed(() => this.state().notifications);
  readonly unreadCount = computed(() =>
    this.state().notifications.filter((notification) => !notification.read_at).length
  );
  readonly hasUnread = computed(() => this.unreadCount() > 0);

  private readonly sessionEffect = effect(() => {
    const userId = this.auth.session()?.user.id ?? null;
    if (userId === this.activeUserId) {
      return;
    }

    this.activeUserId = userId;
    this.disconnectRealtime();

    if (!userId) {
      this.state.set({
        loading: false,
        markAllPending: false,
        error: null,
        notifications: [],
      });
      return;
    }

    void this.load(userId);
    this.connectRealtime(userId);
  });

  ngOnDestroy(): void {
    this.sessionEffect.destroy();
    this.disconnectRealtime();
  }

  async refresh(): Promise<void> {
    const userId = this.activeUserId;
    if (!userId) {
      return;
    }

    await this.load(userId);
  }

  async markAllAsRead(): Promise<void> {
    const userId = this.activeUserId;
    if (!userId || this.markAllPending() || !this.hasUnread()) {
      return;
    }

    this.state.update((state) => ({
      ...state,
      markAllPending: true,
      error: null,
    }));

    try {
      const readAt = new Date().toISOString();
      const { error } = await this.supabase
        .from('notifications')
        .update({ read_at: readAt })
        .eq('owner_id', userId)
        .is('read_at', null);

      if (error) {
        throw error;
      }

      this.state.update((state) => ({
        ...state,
        markAllPending: false,
        notifications: state.notifications.map((notification) =>
          notification.read_at ? notification : { ...notification, read_at: readAt }
        ),
      }));
    } catch (error) {
      console.error('[NotificationsStore] Failed to mark notifications as read', error);
      this.state.update((state) => ({
        ...state,
        markAllPending: false,
        error: 'notifications.errors.markAllRead',
      }));
    }
  }

  private async load(userId: string): Promise<void> {
    this.state.update((state) => ({
      ...state,
      loading: true,
      error: null,
    }));

    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(NOTIFICATIONS_LIMIT);

      if (error) {
        throw error;
      }

      this.state.update((state) => ({
        ...state,
        loading: false,
        notifications: (data ?? []) as NotificationRow[],
      }));
    } catch (error) {
      console.error('[NotificationsStore] Failed to load notifications', error);
      this.state.update((state) => ({
        ...state,
        loading: false,
        error: 'notifications.errors.load',
      }));
    }
  }

  private connectRealtime(userId: string): void {
    this.channel = this.supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `owner_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow | null;
          if (!row) {
            return;
          }

          this.environmentInjector.runInContext(() => {
            this.upsertNotification(row);
          });
        }
      )
      .subscribe();
  }

  private disconnectRealtime(): void {
    if (!this.channel) {
      return;
    }

    void this.supabase.removeChannel(this.channel);
    this.channel = null;
  }

  private upsertNotification(notification: NotificationRow): void {
    this.state.update((state) => {
      const withoutCurrent = state.notifications.filter((item) => item.id !== notification.id);
      return {
        ...state,
        notifications: [notification, ...withoutCurrent]
          .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
          .slice(0, NOTIFICATIONS_LIMIT),
      };
    });
  }
}

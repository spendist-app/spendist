import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { NgIcon } from '@ng-icons/core';
import { heroPencilSquare, heroTrash } from '@ng-icons/heroicons/outline';
import {
  RecurringOccurrenceEntity,
  RecurringPaymentsFilter,
  RecurringPaymentsStore,
  RecurringTransactionEntity,
} from './recurring-payments.store';
import { logError } from '../../../core/logger';
import { nextScheduledOccurrence } from './recurring-schedule';

@Component({
  standalone: true,
  selector: 'app-recurring-payment-list',
  imports: [CommonModule, TranslocoPipe, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recurring-payment-list.component.html',
})
export class RecurringPaymentListComponent {
  readonly editIcon = heroPencilSquare;
  readonly deleteIcon = heroTrash;
  readonly store = inject(RecurringPaymentsStore);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly now = signal(new Date());
  readonly editRequested = output<void>();
  readonly createRequested = output<void>();
  readonly pendingAmounts = signal<Partial<Record<string, string>>>({});
  readonly filterOptions: readonly RecurringPaymentsFilter[] = ['active', 'stopped', 'all'];

  readonly transactions = computed(() =>
    this.store
      .filteredRecurringTransactions()
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      this.now.set(new Date());
    }, 60_000);
    this.destroyRef.onDestroy(() => window.clearInterval(intervalId));
  }

  linkDirectionLabel(direction: RecurringTransactionEntity['direction']): string {
    return direction === 'income'
      ? 'modules.recurringPayments.list.direction.income'
      : 'modules.recurringPayments.list.direction.expense';
  }

  amountModeLabel(transaction: RecurringTransactionEntity): string {
    return transaction.amountMode === 'variable'
      ? 'modules.recurringPayments.list.amountMode.variable'
      : 'modules.recurringPayments.list.amountMode.fixed';
  }

  filterLabel(filter: RecurringPaymentsFilter): string {
    return `modules.recurringPayments.list.filters.${filter}`;
  }

  selectFilter(filter: RecurringPaymentsFilter): void {
    this.store.setRecurringPaymentsFilter(filter);
  }

  scheduleLabel(transaction: RecurringTransactionEntity): string {
    const fields = transaction.schedule.trim().split(/\s+/);
    if (fields.length !== 5) {
      return transaction.schedule;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
    const hourNumber = this.clampCronNumber(hour, 0, 23, 12);
    const minuteNumber = this.clampCronNumber(minute, 0, 59, 0);

    if (month !== '*') {
      return transaction.schedule;
    }

    if (dayOfMonth === '*' && dayOfWeek === '*') {
      const local = this.utcDailyScheduleToLocal(hourNumber, minuteNumber);
      return this.transloco.translate('modules.recurringPayments.list.schedule.daily', {
        time: local.time,
      });
    }

    if (dayOfMonth === '*' && dayOfWeek !== '*') {
      const local = this.utcWeeklyScheduleToLocal(hourNumber, minuteNumber, dayOfWeek);
      return this.transloco.translate('modules.recurringPayments.list.schedule.weekly', {
        day: this.weekdayLabel(local.dayOfWeek),
        time: local.time,
      });
    }

    if (dayOfMonth !== '*' && dayOfWeek === '*') {
      const local = this.utcMonthlyScheduleToLocal(hourNumber, minuteNumber, dayOfMonth);
      return this.transloco.translate('modules.recurringPayments.list.schedule.monthly', {
        day: local.dayOfMonth,
        time: local.time,
      });
    }

    return transaction.schedule;
  }

  nextRunAt(transaction: RecurringTransactionEntity): Date | null {
    if (transaction.isPaused) {
      return null;
    }

    const now = this.now();
    const searchUntil = new Date(now.getTime() + 370 * 24 * 60 * 60 * 1000);
    return nextScheduledOccurrence(transaction, now, searchUntil);
  }

  nextRunLabel(nextRunAt: Date | null): string {
    if (!nextRunAt) {
      return this.transloco.translate('modules.recurringPayments.list.nextRun.none');
    }

    const diffMs = nextRunAt.getTime() - this.now().getTime();
    if (diffMs <= 0) {
      return this.transloco.translate('modules.recurringPayments.list.nextRun.dueNow');
    }

    const totalMinutes = Math.ceil(diffMs / 60_000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
      return this.transloco.translate('modules.recurringPayments.list.nextRun.inDaysHours', {
        days,
        hours,
      });
    }

    if (hours > 0) {
      return this.transloco.translate('modules.recurringPayments.list.nextRun.inHoursMinutes', {
        hours,
        minutes,
      });
    }

    return this.transloco.translate('modules.recurringPayments.list.nextRun.inMinutes', {
      minutes,
    });
  }

  isEditing(transaction: RecurringTransactionEntity): boolean {
    const editing = this.store.editingRecurring();
    return !!editing && editing.id === transaction.id;
  }

  beginEdit(transaction: RecurringTransactionEntity): void {
    this.store.startEditing(transaction.id);
    this.editRequested.emit();
  }

  canStop(transaction: RecurringTransactionEntity): boolean {
    return !transaction.isPaused && !this.isNaturallyEnded(transaction);
  }

  async confirmStop(transaction: RecurringTransactionEntity): Promise<void> {
    const message = this.transloco.translate('modules.recurringPayments.list.confirmStop', {
      name: transaction.name,
    });
    const shouldStop = window.confirm(message);
    if (!shouldStop) {
      return;
    }

    try {
      await this.store.stopRecurringTransaction(transaction.id);
    } catch (error) {
      logError('RecurringPaymentList', 'stop failed', error);
    }
  }

  async confirmResume(transaction: RecurringTransactionEntity): Promise<void> {
    const message = this.transloco.translate('modules.recurringPayments.list.confirmResume', {
      name: transaction.name,
    });
    const shouldResume = window.confirm(message);
    if (!shouldResume) {
      return;
    }

    try {
      await this.store.resumeRecurringTransaction(transaction.id);
    } catch (error) {
      logError('RecurringPaymentList', 'resume failed', error);
    }
  }

  async confirmDelete(transaction: RecurringTransactionEntity): Promise<void> {
    const message = this.transloco.translate('modules.recurringPayments.list.confirmDelete', {
      name: transaction.name,
    });
    const shouldDelete = window.confirm(message);
    if (!shouldDelete) {
      return;
    }

    try {
      await this.store.deleteRecurringTransaction(transaction.id);
    } catch (error) {
      logError('RecurringPaymentList', 'delete failed', error);
    }
  }

  updatePendingAmount(occurrenceId: string, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.pendingAmounts.update((amounts) => ({
      ...amounts,
      [occurrenceId]: target?.value ?? '',
    }));
  }

  async completeOccurrence(occurrence: RecurringOccurrenceEntity): Promise<void> {
    const amount = Number(this.pendingAmounts()[occurrence.id]);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    try {
      await this.store.completePendingOccurrence(occurrence.id, amount);
      this.pendingAmounts.update((amounts) => {
        const next = { ...amounts };
        delete next[occurrence.id];
        return next;
      });
    } catch (error) {
      logError('RecurringPaymentList', 'complete occurrence failed', error);
    }
  }

  private isNaturallyEnded(transaction: RecurringTransactionEntity): boolean {
    if (!transaction.endDate) {
      return false;
    }

    const end = new Date(transaction.endDate);
    end.setHours(23, 59, 59, 999);
    return this.now().getTime() > end.getTime();
  }

  private utcDailyScheduleToLocal(hour: number, minute: number): { readonly time: string } {
    const now = new Date();
    const localDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0, 0));
    return { time: this.formatTime(localDate) };
  }

  private utcWeeklyScheduleToLocal(
    hour: number,
    minute: number,
    dayOfWeek: string,
  ): { readonly time: string; readonly dayOfWeek: string } {
    const now = new Date();
    const targetDay = this.clampCronNumber(dayOfWeek, 0, 7, 1) % 7;
    const daysUntilTarget = (targetDay - now.getUTCDay() + 7) % 7;
    const localDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilTarget,
      hour,
      minute,
      0,
      0,
    ));
    return {
      time: this.formatTime(localDate),
      dayOfWeek: `${localDate.getDay()}`,
    };
  }

  private utcMonthlyScheduleToLocal(
    hour: number,
    minute: number,
    dayOfMonth: string,
  ): { readonly time: string; readonly dayOfMonth: number } {
    const now = new Date();
    const targetDay = this.clampCronNumber(dayOfMonth, 1, 31, 1);
    for (let offset = 0; offset < 12; offset += 1) {
      const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, targetDay, hour, minute, 0, 0));
      if (candidate.getUTCDate() === targetDay) {
        return {
          time: this.formatTime(candidate),
          dayOfMonth: candidate.getDate(),
        };
      }
    }

    const fallback = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, hour, minute, 0, 0));
    return {
      time: this.formatTime(fallback),
      dayOfMonth: fallback.getDate(),
    };
  }

  private clampCronNumber(value: string | number | undefined, min: number, max: number, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(Math.max(Math.trunc(parsed), min), max);
  }

  private formatTime(value: Date): string {
    const hour = `${value.getHours()}`.padStart(2, '0');
    const minute = `${value.getMinutes()}`.padStart(2, '0');
    return `${hour}:${minute}`;
  }

  private weekdayLabel(dayOfWeek: string): string {
    const normalized = dayOfWeek === '7' ? '0' : dayOfWeek;
    const key = {
      '0': 'sunday',
      '1': 'monday',
      '2': 'tuesday',
      '3': 'wednesday',
      '4': 'thursday',
      '5': 'friday',
      '6': 'saturday',
    }[normalized];

    if (!key) {
      return dayOfWeek;
    }

    return this.transloco.translate(`modules.recurringPayments.list.weekdays.${key}`);
  }

}

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
import {
  RecurringOccurrenceEntity,
  RecurringPaymentsStore,
  RecurringTransactionEntity,
} from './recurring-payments.store';

@Component({
  standalone: true,
  selector: 'app-recurring-payment-list',
  imports: [CommonModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recurring-payment-list.component.html',
})
export class RecurringPaymentListComponent {
  readonly store = inject(RecurringPaymentsStore);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly now = signal(new Date());
  readonly editRequested = output<void>();
  readonly createRequested = output<void>();
  readonly pendingAmounts = signal<Partial<Record<string, string>>>({});

  readonly transactions = computed(() =>
    this.store
      .recurringTransactions()
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

  scheduleLabel(transaction: RecurringTransactionEntity): string {
    const fields = transaction.schedule.trim().split(/\s+/);
    if (fields.length !== 5) {
      return transaction.schedule;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
    const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

    if (month !== '*') {
      return transaction.schedule;
    }

    if (dayOfMonth === '*' && dayOfWeek === '*') {
      return this.transloco.translate('modules.recurringPayments.list.schedule.daily', {
        time,
      });
    }

    if (dayOfMonth === '*' && dayOfWeek !== '*') {
      return this.transloco.translate('modules.recurringPayments.list.schedule.weekly', {
        day: this.weekdayLabel(dayOfWeek),
        time,
      });
    }

    if (dayOfMonth !== '*' && dayOfWeek === '*') {
      return this.transloco.translate('modules.recurringPayments.list.schedule.monthly', {
        day: dayOfMonth,
        time,
      });
    }

    return transaction.schedule;
  }

  nextRunAt(transaction: RecurringTransactionEntity): Date | null {
    const schedule = this.parseCron(transaction.schedule);
    if (!schedule) {
      return null;
    }

    const now = this.now();
    const startDate = this.startOfDayUtc(transaction.startDate);
    const endDate = transaction.endDate ? this.endOfDayUtc(transaction.endDate) : null;
    let cursor = this.floorToMinute(new Date(Math.max(now.getTime() + 60_000, startDate.getTime())));

    if (endDate && cursor.getTime() > endDate.getTime()) {
      return null;
    }

    const searchUntil = new Date(cursor.getTime() + 370 * 24 * 60 * 60 * 1000);
    const maxDate = endDate && endDate.getTime() < searchUntil.getTime() ? endDate : searchUntil;

    while (cursor.getTime() <= maxDate.getTime()) {
      if (this.matchesCron(cursor, schedule)) {
        return new Date(cursor);
      }
      cursor = new Date(cursor.getTime() + 60_000);
    }

    return null;
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
      console.error('[RecurringPaymentList] delete failed', error);
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
      console.error('[RecurringPaymentList] complete occurrence failed', error);
    }
  }

  private parseCron(expression: string): readonly [
    ReadonlySet<number>,
    ReadonlySet<number>,
    ReadonlySet<number>,
    ReadonlySet<number>,
    ReadonlySet<number>,
  ] | null {
    const fields = expression.trim().split(/\s+/);
    if (fields.length !== 5) {
      return null;
    }

    const parsed = [
      this.parseCronField(fields[0], 0, 59),
      this.parseCronField(fields[1], 0, 23),
      this.parseCronField(fields[2], 1, 31),
      this.parseCronField(fields[3], 1, 12),
      this.parseCronField(fields[4], 0, 7),
    ] as const;

    return parsed.every((field) => field.size > 0) ? parsed : null;
  }

  private parseCronField(field: string, min: number, max: number): ReadonlySet<number> {
    const values = new Set<number>();

    for (const part of field.split(',')) {
      const [rangePart, stepPart] = part.split('/');
      const step = stepPart ? Number(stepPart) : 1;
      if (!Number.isInteger(step) || step < 1) {
        continue;
      }

      const range = rangePart === '*'
        ? [min, max]
        : rangePart.includes('-')
          ? rangePart.split('-').map(Number)
          : [Number(rangePart), Number(rangePart)];

      const [start, end] = range;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < min || end > max || start > end) {
        continue;
      }

      for (let value = start; value <= end; value += step) {
        values.add(max === 7 && value === 7 ? 0 : value);
      }
    }

    return values;
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

  private matchesCron(
    value: Date,
    [minutes, hours, daysOfMonth, months, daysOfWeek]: readonly [
      ReadonlySet<number>,
      ReadonlySet<number>,
      ReadonlySet<number>,
      ReadonlySet<number>,
      ReadonlySet<number>,
    ],
  ): boolean {
    return minutes.has(value.getUTCMinutes()) &&
      hours.has(value.getUTCHours()) &&
      daysOfMonth.has(value.getUTCDate()) &&
      months.has(value.getUTCMonth() + 1) &&
      daysOfWeek.has(value.getUTCDay());
  }

  private floorToMinute(value: Date): Date {
    const next = new Date(value);
    next.setUTCSeconds(0, 0);
    return next;
  }

  private startOfDayUtc(value: Date): Date {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0));
  }

  private endOfDayUtc(value: Date): Date {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999));
  }
}

import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { TransactionsStore } from '../../transactions/transactions.store';
import { nextScheduledOccurrence } from '../recurring-payments/recurring-schedule';
import {
  AllowanceConnection,
  AllowanceSchedule,
  AllowanceService,
} from './allowance.service';

@Component({
  standalone: true,
  selector: 'app-allowance-page',
  imports: [ReactiveFormsModule, TranslocoPipe, DecimalPipe],
  providers: [TransactionsStore, AllowanceService],
  templateUrl: './allowance.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllowancePageComponent implements OnInit {
  readonly allowance = inject(AllowanceService);
  readonly transactions = inject(TransactionsStore);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly transloco = inject(TranslocoService);

  readonly inviteForm = this.formBuilder.group({
    email: this.formBuilder.control('', [
      Validators.required,
      Validators.email,
      Validators.maxLength(320),
    ]),
  });

  readonly scheduleForm = this.formBuilder.group({
    connectionId: this.formBuilder.control('', Validators.required),
    name: this.formBuilder.control('', [
      Validators.required,
      Validators.maxLength(120),
    ]),
    categoryId: this.formBuilder.control('', Validators.required),
    walletId: this.formBuilder.control('', Validators.required),
    amountMode: this.formBuilder.control<'fixed' | 'variable'>('fixed'),
    amount: this.formBuilder.control(0, [Validators.min(0)]),
    currency: this.formBuilder.control('PLN', [
      Validators.required,
      Validators.pattern(/^[A-Z]{3}$/),
    ]),
    frequency: this.formBuilder.control<'daily' | 'weekly' | 'monthly'>(
      'monthly'
    ),
    time: this.formBuilder.control('08:00', Validators.required),
    weekday: this.formBuilder.control(1),
    monthday: this.formBuilder.control(1, [
      Validators.min(1),
      Validators.max(28),
    ]),
    startDate: this.formBuilder.control(this.today(), Validators.required),
    endDate: this.formBuilder.control(''),
  });

  readonly outgoing = computed(() =>
    this.allowance.connections().filter((item) => item.role === 'payer')
  );
  readonly incoming = computed(() =>
    this.allowance.connections().filter((item) => item.role === 'recipient')
  );

  constructor() {
    effect(() => {
      const connection = this.allowance.activePayerConnections()[0];
      const category = this.transactions.categories()[0];
      const wallet =
        this.transactions.wallets().find((item) => item.isDefault) ??
        this.transactions.wallets()[0];
      if (!this.scheduleForm.controls.connectionId.value && connection) {
        this.scheduleForm.controls.connectionId.setValue(connection.id);
      }
      if (!this.scheduleForm.controls.categoryId.value && category) {
        this.scheduleForm.controls.categoryId.setValue(category.id);
      }
      if (!this.scheduleForm.controls.walletId.value && wallet) {
        this.scheduleForm.patchValue({
          walletId: wallet.id,
          currency: wallet.currency,
        });
      }
    });
  }

  ngOnInit(): void {
    void this.allowance.load();
  }

  async sendInvite(): Promise<void> {
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }
    const success = await this.allowance.invite(
      this.inviteForm.getRawValue().email
    );
    if (success) this.inviteForm.reset({ email: '' });
  }

  async createSchedule(): Promise<void> {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }
    const value = this.scheduleForm.getRawValue();
    if (value.amountMode === 'fixed' && value.amount <= 0) {
      this.scheduleForm.controls.amount.setErrors({ min: true });
      return;
    }
    const success = await this.allowance.createSchedule({
      connectionId: value.connectionId,
      name: value.name,
      categoryId: value.categoryId,
      walletId: value.walletId,
      amountMode: value.amountMode,
      amount: value.amount,
      currency: value.currency,
      schedule: this.toCron(
        value.frequency,
        value.time,
        value.weekday,
        value.monthday
      ),
      startDate: value.startDate,
      endDate: value.endDate || null,
    });
    if (success) {
      this.scheduleForm.patchValue({ name: '', amount: 0 });
      this.scheduleForm.markAsPristine();
    }
  }

  counterpart(connectionId: string): AllowanceConnection | undefined {
    return this.allowance
      .connections()
      .find((connection) => connection.id === connectionId);
  }

  scheduleLabel(schedule: AllowanceSchedule): string {
    const now = new Date();
    const next = nextScheduledOccurrence(
      {
        schedule: schedule.schedule,
        startDate: new Date(`${schedule.startDate}T00:00:00.000Z`),
        endDate: schedule.endDate
          ? new Date(`${schedule.endDate}T00:00:00.000Z`)
          : null,
      },
      now,
      new Date(now.getTime() + 370 * 24 * 60 * 60 * 1000)
    );
    if (!next) {
      return this.transloco.translate(
        'modules.allowance.schedule.noUpcoming'
      );
    }
    const locale = this.transloco.getActiveLang() === 'pl' ? 'pl-PL' : 'en';
    return this.transloco.translate('modules.allowance.schedule.nextRun', {
      date: new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(next),
    });
  }

  private toCron(
    frequency: 'daily' | 'weekly' | 'monthly',
    time: string,
    weekday: number,
    monthday: number
  ): string {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    let base: Date;
    if (frequency === 'weekly') {
      const daysUntilTarget = (weekday - now.getDay() + 7) % 7;
      base = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + daysUntilTarget,
        hours,
        minutes
      );
    } else if (frequency === 'monthly') {
      const useNextMonth = now.getDate() > monthday;
      base = new Date(
        now.getFullYear(),
        now.getMonth() + (useNextMonth ? 1 : 0),
        monthday,
        hours,
        minutes
      );
    } else {
      base = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes
      );
    }
    const minute = base.getUTCMinutes();
    const hour = base.getUTCHours();
    if (frequency === 'weekly') {
      return `${minute} ${hour} * * ${base.getUTCDay()}`;
    }
    if (frequency === 'monthly') {
      return `${minute} ${hour} ${base.getUTCDate()} * *`;
    }
    return `${minute} ${hour} * * *`;
  }

  private today(): string {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
  }
}

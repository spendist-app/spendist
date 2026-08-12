import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { MortgageLoan, MortgagesStore } from './mortgages.store';

@Component({
  selector: 'app-mortgages-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe],
  providers: [MortgagesStore],
  templateUrl: './mortgages.page.html',
})
export class MortgagesPage {
  protected readonly store = inject(MortgagesStore);
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject(TranslocoService);
  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly step = signal(1);
  protected readonly selectedLoan = computed(() => this.store.loans().find((loan) => loan.id === this.editingId()) ?? null);
  protected readonly totals = computed(() => this.store.schedule().reduce((total, row) => ({
    payment: total.payment + row.payment, interest: total.interest + row.interest,
  }), { payment: 0, interest: 0 }));
  protected readonly chartPoints = computed(() => {
    const rows = this.store.schedule().filter((row) => row.entryType === 'installment');
    const max = Math.max(1, ...rows.map((row) => row.openingBalance));
    return rows.map((row, index) => `${rows.length === 1 ? 0 : index / (rows.length - 1) * 100},${100 - row.remainingPrincipal / max * 100}`).join(' ');
  });

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    principal: [300000, [Validators.required, Validators.min(0.01)]],
    disbursedOn: ['', Validators.required],
    firstInstallmentOn: ['', Validators.required],
    termMonths: [300, [Validators.required, Validators.min(1), Validators.max(600)]],
    installmentType: ['equal' as 'equal' | 'decreasing', Validators.required],
    margin: [2, [Validators.required, Validators.min(0)]],
    wiborTenor: ['3M' as '1M' | '3M' | '6M' | '1Y', Validators.required],
    upfrontCost: [0, [Validators.required, Validators.min(0)]],
    walletId: ['', Validators.required],
    categoryId: ['', Validators.required],
    ratePeriods: this.fb.array([this.ratePeriodGroup()]),
    overpayments: this.fb.array([this.overpaymentGroup()]),
    holidays: this.fb.array([this.holidayGroup()]),
  });

  constructor() {
    this.overpayments.clear();
    this.holidays.clear();
  }

  protected get ratePeriods(): FormArray { return this.form.controls.ratePeriods; }
  protected get overpayments(): FormArray { return this.form.controls.overpayments; }
  protected get holidays(): FormArray { return this.form.controls.holidays; }

  protected openCreate(): void {
    this.editingId.set(null); this.step.set(1); this.formOpen.set(true);
    this.form.reset({ principal: 300000, termMonths: 300, installmentType: 'equal', margin: 2, wiborTenor: '3M', upfrontCost: 0 });
    this.ratePeriods.clear(); this.ratePeriods.push(this.ratePeriodGroup());
    this.overpayments.clear(); this.holidays.clear();
  }

  protected async edit(loan: MortgageLoan): Promise<void> {
    const draft = await this.store.loadMortgage(loan.id);
    if (!draft) return;
    this.editingId.set(loan.id); this.formOpen.set(true); this.step.set(1);
    this.form.patchValue({
      name: draft.name, principal: draft.principal, disbursedOn: draft.disbursedOn,
      firstInstallmentOn: draft.firstInstallmentOn, termMonths: draft.termMonths,
      installmentType: draft.installmentType, margin: draft.margin,
      wiborTenor: draft.wiborTenor, upfrontCost: draft.upfrontCost,
      walletId: draft.walletId, categoryId: draft.categoryId,
    });
    this.ratePeriods.clear(); draft.ratePeriods.forEach((row) => this.ratePeriods.push(this.ratePeriodGroup(row)));
    this.overpayments.clear(); draft.overpayments.forEach((row) => this.overpayments.push(this.overpaymentGroup(row)));
    this.holidays.clear(); draft.holidays.forEach((row) => this.holidays.push(this.holidayGroup(row)));
  }

  protected addRatePeriod(): void { this.ratePeriods.push(this.ratePeriodGroup()); }
  protected addOverpayment(): void { this.overpayments.push(this.overpaymentGroup()); }
  protected addHoliday(): void { this.holidays.push(this.holidayGroup()); }
  protected remove(array: FormArray, index: number): void { array.removeAt(index); }
  protected next(): void { this.step.update((value) => Math.min(4, value + 1)); }
  protected previous(): void { this.step.update((value) => Math.max(1, value - 1)); }

  protected async simulate(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    const loan = await this.store.saveAndSimulate({
      name: raw.name ?? '', principal: Number(raw.principal), disbursedOn: raw.disbursedOn ?? '',
      firstInstallmentOn: raw.firstInstallmentOn ?? '', termMonths: Number(raw.termMonths),
      installmentType: raw.installmentType ?? 'equal', margin: Number(raw.margin), wiborTenor: raw.wiborTenor ?? '3M',
      upfrontCost: Number(raw.upfrontCost), walletId: raw.walletId ?? '', categoryId: raw.categoryId ?? '',
      ratePeriods: raw.ratePeriods.map((row) => ({ startsOn: row.startsOn ?? '', endsOn: row.endsOn || null,
        type: row.type ?? 'fixed', fixedRate: row.type === 'fixed' ? Number(row.fixedRate) : null })),
      overpayments: raw.overpayments.map((row) => ({ occursOn: row.occursOn ?? '', amount: Number(row.amount), strategy: row.strategy ?? 'shorten_term' })),
      holidays: raw.holidays.map((row) => ({ startsOn: row.startsOn ?? '', endsOn: row.endsOn ?? '' })),
    }, this.editingId() ?? undefined);
    this.editingId.set(loan.id); this.step.set(4);
  }

  protected async sync(): Promise<void> {
    const id = this.editingId(); if (!id) return;
    const action = this.selectedLoan()?.transactionsAttached ? 'updateConfirm' : 'attachConfirm';
    if (window.confirm(this.i18n.translate(`mortgages.actions.${action}`))) await this.store.syncTransactions(id);
  }

  protected async detach(): Promise<void> {
    const id = this.editingId();
    if (id && window.confirm(this.i18n.translate('mortgages.actions.detachConfirm'))) await this.store.detachTransactions(id);
  }

  protected async deleteLoan(loan: MortgageLoan): Promise<void> {
    if (window.confirm(this.i18n.translate('mortgages.actions.deleteConfirm', { name: loan.name }))) {
      await this.store.deleteMortgage(loan.id); this.formOpen.set(false); this.editingId.set(null);
    }
  }

  private ratePeriodGroup(value?: { startsOn: string; endsOn: string | null; type: 'fixed' | 'variable'; fixedRate: number | null }) {
    return this.fb.group({ startsOn: [value?.startsOn ?? '', Validators.required], endsOn: [value?.endsOn ?? ''],
      type: [value?.type ?? 'fixed' as 'fixed' | 'variable', Validators.required], fixedRate: [value?.fixedRate ?? 6] });
  }
  private overpaymentGroup(value?: { occursOn: string; amount: number; strategy: 'shorten_term' | 'reduce_payment' }) {
    return this.fb.group({ occursOn: [value?.occursOn ?? '', Validators.required], amount: [value?.amount ?? 1000, [Validators.required, Validators.min(0.01)]],
      strategy: [value?.strategy ?? 'shorten_term' as 'shorten_term' | 'reduce_payment', Validators.required] });
  }
  private holidayGroup(value?: { startsOn: string; endsOn: string }) {
    return this.fb.group({ startsOn: [value?.startsOn ?? '', Validators.required], endsOn: [value?.endsOn ?? '', Validators.required] });
  }
}

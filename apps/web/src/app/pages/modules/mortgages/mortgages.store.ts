import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from '../../../core/auth.service';
import { logError } from '../../../core/logger';
import { SUPABASE_CLIENT } from '../../../core/supabase';
import {
  calculateMortgageSchedule,
  MortgageCalculationInput,
  MortgageHoliday,
  MortgageOverpayment,
  MortgageRatePeriod,
  MortgageScheduleEntry,
} from './mortgage-calculator';

export interface MortgageLoan {
  readonly id: string;
  readonly name: string;
  readonly principal: number;
  readonly disbursedOn: string;
  readonly firstInstallmentOn: string;
  readonly termMonths: number;
  readonly installmentType: 'equal' | 'decreasing';
  readonly margin: number;
  readonly wiborTenor: '1M' | '3M' | '6M' | '1Y';
  readonly upfrontCost: number;
  readonly walletId: string;
  readonly categoryId: string;
  readonly revision: number;
  readonly transactionsAttached: boolean;
}

export interface MortgageDraft extends Omit<MortgageLoan, 'id' | 'revision' | 'transactionsAttached'> {
  readonly ratePeriods: readonly MortgageRatePeriod[];
  readonly overpayments: readonly MortgageOverpayment[];
  readonly holidays: readonly MortgageHoliday[];
}

interface Choice { readonly id: string; readonly name: string }

@Injectable()
export class MortgagesStore {
  private readonly supabase = inject<SupabaseClient>(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);
  private readonly state = signal({ loading: true, pending: false, error: null as string | null });
  private readonly loansState = signal<readonly MortgageLoan[]>([]);
  private readonly scheduleState = signal<readonly MortgageScheduleEntry[]>([]);
  private readonly walletsState = signal<readonly Choice[]>([]);
  private readonly categoriesState = signal<readonly Choice[]>([]);

  readonly loading = computed(() => this.state().loading);
  readonly pending = computed(() => this.state().pending);
  readonly error = computed(() => this.state().error);
  readonly loans = this.loansState.asReadonly();
  readonly schedule = this.scheduleState.asReadonly();
  readonly wallets = this.walletsState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();

  constructor() {
    effect(() => {
      if (!this.auth.loading()) void this.load();
    });
  }

  async load(): Promise<void> {
    const ownerId = this.auth.session()?.user.id;
    if (!ownerId) return;
    this.state.update((state) => ({ ...state, loading: true, error: null }));
    try {
      const [loans, wallets, categories] = await Promise.all([
        this.supabase.from('mortgage_loans').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
        this.supabase.from('wallets').select('id,name').eq('owner_id', ownerId).order('name'),
        this.supabase.from('categories').select('id,name').eq('owner_id', ownerId).order('name'),
      ]);
      if (loans.error) throw loans.error;
      if (wallets.error) throw wallets.error;
      if (categories.error) throw categories.error;
      this.loansState.set((loans.data ?? []).map((row) => this.mapLoan(row)));
      this.walletsState.set((wallets.data ?? []) as Choice[]);
      this.categoriesState.set((categories.data ?? []) as Choice[]);
      this.state.update((state) => ({ ...state, loading: false }));
    } catch (error) {
      this.fail('Could not load mortgages.', error);
    }
  }

  async loadMortgage(id: string): Promise<MortgageDraft | null> {
    const loan = this.loans().find((item) => item.id === id);
    if (!loan) return null;
    const [periods, overpayments, holidays, schedule] = await Promise.all([
      this.supabase.from('mortgage_rate_periods').select('*').eq('mortgage_id', id).order('position'),
      this.supabase.from('mortgage_overpayments').select('*').eq('mortgage_id', id).order('occurs_on'),
      this.supabase.from('mortgage_holidays').select('*').eq('mortgage_id', id).order('starts_on'),
      this.supabase.from('mortgage_schedule_entries').select('*').eq('mortgage_id', id).eq('revision', loan.revision).order('sequence'),
    ]);
    for (const result of [periods, overpayments, holidays, schedule]) if (result.error) throw result.error;
    this.scheduleState.set((schedule.data ?? []).map((row) => this.mapSchedule(row)));
    return {
      ...loan,
      ratePeriods: (periods.data ?? []).map((row) => ({
        startsOn: String(row['starts_on']), endsOn: row['ends_on'] ? String(row['ends_on']) : null,
        type: row['rate_type'] as 'fixed' | 'variable', fixedRate: row['fixed_rate'] === null ? null : Number(row['fixed_rate']),
      })),
      overpayments: (overpayments.data ?? []).map((row) => ({
        occursOn: String(row['occurs_on']), amount: Number(row['amount']),
        strategy: row['strategy'] as 'shorten_term' | 'reduce_payment',
      })),
      holidays: (holidays.data ?? []).map((row) => ({ startsOn: String(row['starts_on']), endsOn: String(row['ends_on']) })),
    };
  }

  async saveAndSimulate(draft: MortgageDraft, existingId?: string): Promise<MortgageLoan> {
    const ownerId = this.auth.session()?.user.id;
    if (!ownerId) throw new Error('Authentication required.');
    this.state.update((state) => ({ ...state, pending: true, error: null }));
    try {
      const payload = {
        owner_id: ownerId, name: draft.name.trim(), principal: draft.principal, currency: 'PLN',
        disbursed_on: draft.disbursedOn, first_installment_on: draft.firstInstallmentOn,
        term_months: draft.termMonths, installment_type: draft.installmentType,
        margin: draft.margin, wibor_tenor: draft.wiborTenor, upfront_cost: draft.upfrontCost,
        wallet_id: draft.walletId, category_id: draft.categoryId,
      };
      const saved = existingId
        ? await this.supabase.from('mortgage_loans').update(payload).eq('id', existingId).eq('owner_id', ownerId).select('*').single()
        : await this.supabase.from('mortgage_loans').insert(payload).select('*').single();
      if (saved.error) throw saved.error;
      const id = String(saved.data['id']);
      await this.replaceChildren(ownerId, id, draft);

      const ratesResult = await this.supabase.from('wibor_rates').select('rate_date,tenor,value').order('rate_date');
      if (ratesResult.error) throw ratesResult.error;
      const calculation: MortgageCalculationInput = {
        ...draft,
        wiborRates: (ratesResult.data ?? []).map((row) => ({
          rateDate: String(row['rate_date']), tenor: row['tenor'] as MortgageCalculationInput['wiborTenor'], value: Number(row['value']),
        })),
        asOf: new Date().toISOString().slice(0, 10),
      };
      const schedule = calculateMortgageSchedule(calculation);
      const revision = Number(saved.data['revision']) + 1;
      const rows = schedule.map((entry) => ({
        owner_id: ownerId, mortgage_id: id, revision, sequence: entry.sequence,
        scheduled_for: entry.scheduledFor, entry_type: entry.entryType,
        opening_balance: entry.openingBalance, annual_rate: entry.annualRate,
        wibor_value: entry.wiborValue, wibor_rate_date: entry.wiborRateDate,
        rate_status: entry.rateStatus, payment: entry.payment, principal_part: entry.principal,
        interest_part: entry.interest, remaining_principal: entry.remainingPrincipal,
      }));
      const inserted = await this.supabase.from('mortgage_schedule_entries').insert(rows);
      if (inserted.error) throw inserted.error;
      const updated = await this.supabase.from('mortgage_loans').update({ revision }).eq('id', id).select('*').single();
      if (updated.error) throw updated.error;
      this.scheduleState.set(schedule);
      await this.load();
      return this.mapLoan(updated.data);
    } catch (error) {
      this.fail('Could not generate the mortgage schedule.', error);
      throw error;
    } finally {
      this.state.update((state) => ({ ...state, pending: false }));
    }
  }

  async syncTransactions(id: string): Promise<void> {
    this.state.update((state) => ({ ...state, pending: true, error: null }));
    try {
      const result = await this.supabase.rpc('sync_mortgage_transactions', { p_mortgage_id: id });
      if (result.error) throw result.error;
      await this.load();
    } catch (error) { this.fail('Could not synchronize transactions.', error); throw error; }
    finally { this.state.update((state) => ({ ...state, pending: false })); }
  }

  async detachTransactions(id: string): Promise<void> {
    const result = await this.supabase.rpc('detach_mortgage_transactions', { p_mortgage_id: id });
    if (result.error) throw result.error;
    await this.load();
  }

  async deleteMortgage(id: string): Promise<void> {
    const loan = this.loans().find((item) => item.id === id);
    if (loan?.transactionsAttached) await this.detachTransactions(id);
    const result = await this.supabase.from('mortgage_loans').delete().eq('id', id);
    if (result.error) throw result.error;
    this.scheduleState.set([]);
    await this.load();
  }

  private async replaceChildren(ownerId: string, id: string, draft: MortgageDraft): Promise<void> {
    for (const table of ['mortgage_rate_periods', 'mortgage_overpayments', 'mortgage_holidays'] as const) {
      const removed = await this.supabase.from(table).delete().eq('mortgage_id', id).eq('owner_id', ownerId);
      if (removed.error) throw removed.error;
    }
    const periods = await this.supabase.from('mortgage_rate_periods').insert(draft.ratePeriods.map((period, position) => ({
      owner_id: ownerId, mortgage_id: id, position, starts_on: period.startsOn,
      ends_on: period.endsOn, rate_type: period.type, fixed_rate: period.type === 'fixed' ? period.fixedRate : null,
    })));
    if (periods.error) throw periods.error;
    if (draft.overpayments.length) {
      const result = await this.supabase.from('mortgage_overpayments').insert(draft.overpayments.map((item) => ({
        owner_id: ownerId, mortgage_id: id, occurs_on: item.occursOn, amount: item.amount, strategy: item.strategy,
      })));
      if (result.error) throw result.error;
    }
    if (draft.holidays.length) {
      const result = await this.supabase.from('mortgage_holidays').insert(draft.holidays.map((item) => ({
        owner_id: ownerId, mortgage_id: id, starts_on: item.startsOn, ends_on: item.endsOn,
      })));
      if (result.error) throw result.error;
    }
  }

  private mapLoan(row: Record<string, unknown>): MortgageLoan {
    return {
      id: String(row['id']), name: String(row['name']), principal: Number(row['principal']),
      disbursedOn: String(row['disbursed_on']), firstInstallmentOn: String(row['first_installment_on']),
      termMonths: Number(row['term_months']), installmentType: row['installment_type'] as MortgageLoan['installmentType'],
      margin: Number(row['margin']), wiborTenor: row['wibor_tenor'] as MortgageLoan['wiborTenor'],
      upfrontCost: Number(row['upfront_cost']), walletId: String(row['wallet_id']), categoryId: String(row['category_id']),
      revision: Number(row['revision']), transactionsAttached: Boolean(row['transactions_attached']),
    };
  }

  private mapSchedule(row: Record<string, unknown>): MortgageScheduleEntry {
    return {
      sequence: Number(row['sequence']), scheduledFor: String(row['scheduled_for']),
      entryType: row['entry_type'] as MortgageScheduleEntry['entryType'], openingBalance: Number(row['opening_balance']),
      annualRate: Number(row['annual_rate']), wiborValue: row['wibor_value'] === null ? null : Number(row['wibor_value']),
      wiborRateDate: row['wibor_rate_date'] ? String(row['wibor_rate_date']) : null,
      rateStatus: row['rate_status'] as MortgageScheduleEntry['rateStatus'], payment: Number(row['payment']),
      principal: Number(row['principal_part']), interest: Number(row['interest_part']), remainingPrincipal: Number(row['remaining_principal']),
    };
  }

  private fail(message: string, error: unknown): void {
    logError('MortgagesStore', message, error);
    this.state.update((state) => ({ ...state, loading: false, error: message }));
  }
}

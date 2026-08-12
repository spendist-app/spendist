export type MortgageInstallmentType = 'equal' | 'decreasing';
export type MortgageRateType = 'fixed' | 'variable';
export type WiborTenor = '1M' | '3M' | '6M' | '1Y';
export type OverpaymentStrategy = 'shorten_term' | 'reduce_payment';

export interface MortgageRatePeriod {
  readonly startsOn: string;
  readonly endsOn: string | null;
  readonly type: MortgageRateType;
  readonly fixedRate: number | null;
}

export interface MortgageOverpayment {
  readonly occursOn: string;
  readonly amount: number;
  readonly strategy: OverpaymentStrategy;
}

export interface MortgageHoliday {
  readonly startsOn: string;
  readonly endsOn: string;
}

export interface WiborRate {
  readonly rateDate: string;
  readonly tenor: WiborTenor;
  readonly value: number;
}

export interface MortgageCalculationInput {
  readonly principal: number;
  readonly disbursedOn: string;
  readonly firstInstallmentOn: string;
  readonly termMonths: number;
  readonly installmentType: MortgageInstallmentType;
  readonly margin: number;
  readonly wiborTenor: WiborTenor;
  readonly ratePeriods: readonly MortgageRatePeriod[];
  readonly overpayments: readonly MortgageOverpayment[];
  readonly holidays: readonly MortgageHoliday[];
  readonly wiborRates: readonly WiborRate[];
  readonly asOf: string;
}

export type MortgageScheduleEntryType = 'installment' | 'overpayment' | 'holiday';
export type MortgageRateStatus = 'fixed' | 'confirmed' | 'projected' | 'missing';

export interface MortgageScheduleEntry {
  readonly sequence: number;
  readonly scheduledFor: string;
  readonly entryType: MortgageScheduleEntryType;
  readonly openingBalance: number;
  readonly annualRate: number;
  readonly wiborValue: number | null;
  readonly wiborRateDate: string | null;
  readonly rateStatus: MortgageRateStatus;
  readonly payment: number;
  readonly principal: number;
  readonly interest: number;
  readonly remainingPrincipal: number;
}

const TENOR_MONTHS: Record<WiborTenor, number> = {
  '1M': 1,
  '3M': 3,
  '6M': 6,
  '1Y': 12,
};

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addMonths(value: Date, months: number): Date {
  const day = value.getUTCDate();
  const result = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

function containsDate(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function findPeriod(periods: readonly MortgageRatePeriod[], date: string): MortgageRatePeriod {
  const period = periods.find((item) => date >= item.startsOn && (!item.endsOn || date <= item.endsOn));
  if (!period) {
    throw new Error(`No interest-rate period covers ${date}.`);
  }
  return period;
}

function resolveRate(
  input: MortgageCalculationInput,
  date: string,
  period: MortgageRatePeriod
): { annualRate: number; value: number | null; date: string | null; status: MortgageRateStatus } {
  if (period.type === 'fixed') {
    return { annualRate: period.fixedRate ?? 0, value: null, date: null, status: 'fixed' };
  }

  const periodStart = parseDate(period.startsOn);
  const current = parseDate(date);
  const monthDelta =
    (current.getUTCFullYear() - periodStart.getUTCFullYear()) * 12 +
    current.getUTCMonth() - periodStart.getUTCMonth();
  const resetDate = formatDate(addMonths(periodStart, Math.max(0, Math.floor(monthDelta / TENOR_MONTHS[input.wiborTenor])) * TENOR_MONTHS[input.wiborTenor]));
  const matching = input.wiborRates
    .filter((rate) => rate.tenor === input.wiborTenor && rate.rateDate <= resetDate)
    .sort((a, b) => b.rateDate.localeCompare(a.rateDate))[0];

  if (!matching) {
    return { annualRate: input.margin, value: null, date: null, status: 'missing' };
  }
  return {
    annualRate: input.margin + matching.value,
    value: matching.value,
    date: matching.rateDate,
    status: resetDate > input.asOf ? 'projected' : 'confirmed',
  };
}

function equalPayment(balance: number, annualRate: number, remaining: number): number {
  if (remaining <= 0) return balance;
  const monthlyRate = annualRate / 1200;
  if (monthlyRate === 0) return balance / remaining;
  return balance * (monthlyRate * Math.pow(1 + monthlyRate, remaining)) /
    (Math.pow(1 + monthlyRate, remaining) - 1);
}

export function calculateMortgageSchedule(input: MortgageCalculationInput): readonly MortgageScheduleEntry[] {
  if (input.principal <= 0 || input.termMonths < 1) {
    throw new Error('Principal and term must be positive.');
  }
  if (input.ratePeriods.length === 0) {
    throw new Error('At least one interest-rate period is required.');
  }

  const entries: MortgageScheduleEntry[] = [];
  let balance = roundMoney(input.principal);
  let previousDate = parseDate(input.disbursedOn);
  let dueDate = parseDate(input.firstInstallmentOn);
  let paidInstallments = 0;
  let targetInstallments = input.termMonths;
  let sequence = 1;

  while (balance > 0 && paidInstallments < targetInstallments && sequence < 1201) {
    const date = formatDate(dueDate);
    const openingBalance = balance;
    const holiday = input.holidays.some((item) => containsDate(date, item.startsOn, item.endsOn));
    const period = findPeriod(input.ratePeriods, date);
    const rate = resolveRate(input, date, period);

    if (holiday) {
      entries.push({
        sequence: sequence++, scheduledFor: date, entryType: 'holiday', openingBalance,
        annualRate: rate.annualRate, wiborValue: rate.value, wiborRateDate: rate.date,
        rateStatus: rate.status, payment: 0, principal: 0, interest: 0,
        remainingPrincipal: balance,
      });
      previousDate = dueDate;
      dueDate = addMonths(dueDate, 1);
      continue;
    }

    const interest = roundMoney(openingBalance * rate.annualRate / 100 * daysBetween(previousDate, dueDate) / 365);
    const remainingInstallments = Math.max(1, targetInstallments - paidInstallments);
    const expectedPayment = input.installmentType === 'equal'
      ? equalPayment(openingBalance, rate.annualRate, remainingInstallments)
      : openingBalance / remainingInstallments + interest;
    const principal = remainingInstallments === 1
      ? openingBalance
      : roundMoney(Math.min(openingBalance, Math.max(0, expectedPayment - interest)));
    balance = roundMoney(openingBalance - principal);
    entries.push({
      sequence: sequence++, scheduledFor: date, entryType: 'installment', openingBalance,
      annualRate: rate.annualRate, wiborValue: rate.value, wiborRateDate: rate.date,
      rateStatus: rate.status, payment: roundMoney(principal + interest), principal,
      interest, remainingPrincipal: balance,
    });
    paidInstallments += 1;

    for (const overpayment of input.overpayments.filter((item) => item.occursOn === date)) {
      const overpaid = roundMoney(Math.min(balance, overpayment.amount));
      const before = balance;
      balance = roundMoney(balance - overpaid);
      entries.push({
        sequence: sequence++, scheduledFor: date, entryType: 'overpayment', openingBalance: before,
        annualRate: rate.annualRate, wiborValue: rate.value, wiborRateDate: rate.date,
        rateStatus: rate.status, payment: overpaid, principal: overpaid, interest: 0,
        remainingPrincipal: balance,
      });
      if (overpayment.strategy === 'shorten_term' && balance > 0) {
        const regularPrincipal = Math.max(0.01, principal);
        targetInstallments = Math.min(targetInstallments, paidInstallments + Math.ceil(balance / regularPrincipal));
      }
    }

    previousDate = dueDate;
    dueDate = addMonths(dueDate, 1);
  }

  if (entries.length >= 1200) throw new Error('Schedule exceeds 1,200 entries.');
  return entries;
}

import { countScheduledOccurrences } from './recurring-schedule';

interface RecurringPlanItem {
  readonly schedule: string;
  readonly startDate: Date;
  readonly endDate: Date | null;
  readonly amount: number;
  readonly amountMode: 'fixed' | 'variable';
  readonly currency: string;
  readonly exchangeRate: number | null;
  readonly direction: 'income' | 'expense';
  readonly isPaused: boolean;
}

export interface RecurringMonthlyPlan {
  readonly generatedExpense: number;
  readonly scheduledExpense: number;
  readonly totalExpense: number;
  readonly scheduledCount: number;
}

export function calculateRecurringMonthlyPlan(
  recurringTransactions: readonly RecurringPlanItem[],
  generatedExpense: number,
  defaultCurrency: string,
  now: Date,
): RecurringMonthlyPlan {
  const monthEnd = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  ));
  let scheduledExpense = 0;
  let scheduledCount = 0;

  for (const recurring of recurringTransactions) {
    if (
      recurring.isPaused ||
      recurring.direction !== 'expense' ||
      recurring.amountMode !== 'fixed'
    ) {
      continue;
    }

    const occurrenceCount = countScheduledOccurrences(
      recurring,
      now,
      monthEnd,
    );
    if (occurrenceCount === 0) {
      continue;
    }

    scheduledCount += occurrenceCount;
    scheduledExpense += occurrenceCount * amountInDefaultCurrency(
      recurring,
      defaultCurrency,
    );
  }

  return {
    generatedExpense,
    scheduledExpense,
    totalExpense: generatedExpense + scheduledExpense,
    scheduledCount,
  };
}

function amountInDefaultCurrency(
  recurring: RecurringPlanItem,
  defaultCurrency: string,
): number {
  if (recurring.currency.toUpperCase() === defaultCurrency.toUpperCase()) {
    return recurring.amount;
  }

  if (recurring.exchangeRate !== null && recurring.exchangeRate > 0) {
    return recurring.amount * recurring.exchangeRate;
  }

  return recurring.amount;
}

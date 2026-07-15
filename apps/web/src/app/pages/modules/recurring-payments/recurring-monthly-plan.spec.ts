import { describe, expect, it } from 'vitest';
import { calculateRecurringMonthlyPlan } from './recurring-monthly-plan';

describe('recurring monthly plan', () => {
  it('combines generated expenses with every remaining fixed expense', () => {
    const base = {
      schedule: '0 12 * * *',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: null,
      amount: 25,
      amountMode: 'fixed' as const,
      currency: 'PLN',
      exchangeRate: null,
      direction: 'expense' as const,
      isPaused: false,
    };

    const plan = calculateRecurringMonthlyPlan(
      [
        base,
        { ...base, amount: 100, amountMode: 'variable' },
        { ...base, amount: 200, direction: 'income' },
        { ...base, amount: 300, isPaused: true },
      ],
      125,
      'PLN',
      new Date('2026-07-29T13:00:00.000Z'),
    );

    expect(plan).toEqual({
      generatedExpense: 125,
      scheduledExpense: 50,
      totalExpense: 175,
      scheduledCount: 2,
    });
  });
});

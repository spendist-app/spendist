import { describe, expect, it } from 'vitest';
import {
  countScheduledOccurrences,
  nextScheduledOccurrence,
} from './recurring-schedule';

describe('recurring schedule', () => {
  it('finds the next monthly occurrence in UTC', () => {
    const recurring = {
      schedule: '0 12 25 * *',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: null,
    };

    expect(
      nextScheduledOccurrence(
        recurring,
        new Date('2026-07-15T10:00:00.000Z'),
        new Date('2026-08-31T23:59:59.999Z'),
      )?.toISOString(),
    ).toBe('2026-07-25T12:00:00.000Z');
  });

  it('counts every remaining daily occurrence through month end', () => {
    const recurring = {
      schedule: '0 12 * * *',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: null,
    };

    expect(
      countScheduledOccurrences(
        recurring,
        new Date('2026-07-28T10:00:00.000Z'),
        new Date('2026-07-31T23:59:59.999Z'),
      ),
    ).toBe(4);
  });

  it('respects the recurring start and end dates', () => {
    const recurring = {
      schedule: '0 12 * * *',
      startDate: new Date('2026-07-29T00:00:00.000Z'),
      endDate: new Date('2026-07-30T00:00:00.000Z'),
    };

    expect(
      countScheduledOccurrences(
        recurring,
        new Date('2026-07-20T10:00:00.000Z'),
        new Date('2026-07-31T23:59:59.999Z'),
      ),
    ).toBe(2);
  });

  it('returns no occurrences for an invalid cron expression', () => {
    const recurring = {
      schedule: 'not a cron',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: null,
    };

    expect(
      countScheduledOccurrences(
        recurring,
        new Date('2026-07-01T00:00:00.000Z'),
        new Date('2026-07-31T23:59:59.999Z'),
      ),
    ).toBe(0);
  });
});

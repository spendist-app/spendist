import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dueOccurrences,
  parseCron,
  parseDateStart,
  shouldFinalizeRecurring,
} from './schedule.mts';

test('returns every due occurrence before a historical end date', () => {
  const recurring = {
    schedule: '0 12 1 * *',
    start_date: '2025-01-01',
    end_date: '2025-02-28',
    last_run_at: null,
  };

  const schedule = parseCron(recurring.schedule);
  assert.ok(schedule);

  const runs = dueOccurrences(
    recurring,
    schedule,
    parseDateStart(recurring.start_date),
    new Date('2025-03-15T12:00:00.000Z'),
    100
  );

  assert.deepEqual(
    runs.map((run) => run.toISOString()),
    ['2025-01-01T12:00:00.000Z', '2025-02-01T12:00:00.000Z']
  );
  assert.equal(
    shouldFinalizeRecurring(recurring, new Date('2025-03-15T12:00:00.000Z')),
    true
  );
});

test('does not finalize an already finalized historical schedule again', () => {
  const recurring = {
    schedule: '0 12 1 * *',
    start_date: '2025-01-01',
    end_date: '2025-02-28',
    last_run_at: '2025-03-15T12:00:00.000Z',
  };

  assert.equal(
    shouldFinalizeRecurring(recurring, new Date('2025-03-16T12:00:00.000Z')),
    false
  );
});

test('manual backfill recovers occurrences older than the automatic lookback', () => {
  const recurring = {
    schedule: '0 12 * * *',
    start_date: '2026-08-01',
    end_date: null,
    last_run_at: '2026-09-01T12:00:00.000Z',
  };

  const schedule = parseCron(recurring.schedule);
  assert.ok(schedule);

  const now = new Date('2026-10-05T12:00:00.000Z');

  const automaticRuns = dueOccurrences(
    recurring,
    schedule,
    new Date('2026-09-04T12:00:00.000Z'),
    now,
    100
  );

  const manualRuns = dueOccurrences(
    recurring,
    schedule,
    parseDateStart(recurring.start_date),
    now,
    100
  );

  assert.equal(automaticRuns[0]?.toISOString(), '2026-09-04T12:00:00.000Z');
  assert.equal(manualRuns[0]?.toISOString(), '2026-09-02T12:00:00.000Z');
});

test('backfill can continue after a per-request run limit', () => {
  const recurring = {
    schedule: '0 12 * * *',
    start_date: '2026-10-01',
    end_date: null,
    last_run_at: null,
  };

  const schedule = parseCron(recurring.schedule);
  assert.ok(schedule);

  const now = new Date('2026-10-05T12:00:00.000Z');

  const firstBatch = dueOccurrences(
    recurring,
    schedule,
    parseDateStart(recurring.start_date),
    now,
    2
  );

  const secondBatch = dueOccurrences(
    { ...recurring, last_run_at: firstBatch.at(-1)?.toISOString() ?? null },
    schedule,
    parseDateStart(recurring.start_date),
    now,
    2
  );

  assert.deepEqual(
    [...firstBatch, ...secondBatch].map((run) => run.toISOString()),
    [
      '2026-10-01T12:00:00.000Z',
      '2026-10-02T12:00:00.000Z',
      '2026-10-03T12:00:00.000Z',
      '2026-10-04T12:00:00.000Z',
    ]
  );
});

// Minute-by-minute reference: the previous implementation, kept to prove the
// day-based search returns exactly the same occurrences.
function referenceOccurrences(
  expression: string,
  start: string,
  end: string,
  maxRuns: number
): string[] {
  const [minutes, hours, days, months, weekdays] = parseCron(expression) ?? [];
  const runs: string[] = [];

  for (
    let cursor = new Date(start).getTime();
    cursor <= new Date(end).getTime() && runs.length < maxRuns;
    cursor += 60_000
  ) {
    const value = new Date(cursor);

    if (
      minutes?.has(value.getUTCMinutes()) &&
      hours?.has(value.getUTCHours()) &&
      days?.has(value.getUTCDate()) &&
      months?.has(value.getUTCMonth() + 1) &&
      weekdays?.has(value.getUTCDay())
    ) {
      runs.push(value.toISOString());
    }
  }

  return runs;
}

test('day-based search matches the minute-by-minute reference', () => {
  const now = new Date('2026-03-31T23:59:00.000Z');

  for (const expression of [
    '30 6 * * *',
    '0 12 * * 1',
    '45 23 * * 0',
    '0 8 31 * *',
    '15 9 1 * *',
    '0,30 */6 * * 1-5',
    '* * 29 2 *',
  ]) {
    for (const lastRun of [null, '2026-01-14T06:30:00.000Z']) {
      const recurring = {
        schedule: expression,
        start_date: '2026-01-10',
        end_date: null,
        last_run_at: lastRun,
      };

      const schedule = parseCron(expression);
      assert.ok(schedule);

      const earliest = new Date('2026-01-12T10:17:00.000Z');

      const runs = dueOccurrences(recurring, schedule, earliest, now, 40).map(
        (run) => run.toISOString()
      );

      const from = new Date(
        Math.max(
          earliest.getTime(),
          lastRun ? new Date(lastRun).getTime() + 60_000 : 0
        )
      ).toISOString();

      assert.deepEqual(
        runs,
        referenceOccurrences(expression, from, now.toISOString(), 40),
        `${expression} after ${lastRun}`
      );
    }
  }
});

test('a schedule that never fires stays cheap over decades', () => {
  const recurring = {
    schedule: '0 0 31 2 *',
    start_date: '2000-01-01',
    end_date: null,
    last_run_at: null,
  };

  const schedule = parseCron(recurring.schedule);
  assert.ok(schedule);

  const started = performance.now();

  const runs = dueOccurrences(
    recurring,
    schedule,
    parseDateStart(recurring.start_date),
    new Date('2026-10-28T12:00:00.000Z'),
    100
  );

  assert.deepEqual(runs, []);
  assert.ok(performance.now() - started < 200);
});

test('an every-minute schedule stops at the run limit', () => {
  const recurring = {
    schedule: '* * * * *',
    start_date: '2026-09-01',
    end_date: null,
    last_run_at: null,
  };

  const schedule = parseCron(recurring.schedule);
  assert.ok(schedule);

  const runs = dueOccurrences(
    recurring,
    schedule,
    parseDateStart(recurring.start_date),
    new Date('2026-10-28T12:00:00.000Z'),
    25
  );

  assert.equal(runs.length, 25);
  assert.equal(runs[24].toISOString(), '2026-09-01T00:24:00.000Z');
});

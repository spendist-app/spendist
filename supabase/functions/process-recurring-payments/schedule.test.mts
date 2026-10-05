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

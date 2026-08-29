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

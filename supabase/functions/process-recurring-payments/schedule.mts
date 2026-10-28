export type RecurringTransactionSchedule = {
  schedule: string;
  start_date: string;
  end_date: string | null;
  last_run_at: string | null;
};

type CronField = ReadonlySet<number>;

export type ParsedCron = readonly [
  CronField,
  CronField,
  CronField,
  CronField,
  CronField
];

export function dueOccurrences(
  recurring: RecurringTransactionSchedule,
  schedule: ParsedCron,
  earliest: Date,
  now: Date,
  maxRuns: number
): Date[] {
  const startDate = parseDateStart(recurring.start_date);

  const lastRun = recurring.last_run_at
    ? new Date(recurring.last_run_at)
    : null;

  const start = floorToMinute(
    new Date(
      Math.max(
        earliest.getTime(),
        startDate.getTime(),
        lastRun ? lastRun.getTime() + 60_000 : startDate.getTime()
      )
    )
  );

  const endDate = recurring.end_date ? parseDateEnd(recurring.end_date) : now;
  const end = new Date(Math.min(now.getTime(), endDate.getTime()));

  return matchingMinutes(schedule, start, end, maxRuns);
}

const MINUTE_MS = 60_000;

const DAY_MS = 24 * 60 * MINUTE_MS;

// Walks whole days and expands only matching days into minutes, so the cost
// depends on the number of days in the range, not on minutes or on how often
// the schedule fires.
function matchingMinutes(
  [minutes, hours, daysOfMonth, months, daysOfWeek]: ParsedCron,
  start: Date,
  end: Date,
  maxRuns: number
): Date[] {
  const sortedHours = [...hours].sort((left, right) => left - right);
  const sortedMinutes = [...minutes].sort((left, right) => left - right);
  const runs: Date[] = [];

  const firstDay = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  );

  for (let day = firstDay; day <= end.getTime(); day += DAY_MS) {
    const date = new Date(day);

    if (
      !daysOfMonth.has(date.getUTCDate()) ||
      !months.has(date.getUTCMonth() + 1) ||
      !daysOfWeek.has(date.getUTCDay())
    ) {
      continue;
    }

    for (const hour of sortedHours) {
      for (const minute of sortedMinutes) {
        const run = day + hour * 60 * MINUTE_MS + minute * MINUTE_MS;

        if (run < start.getTime()) {
          continue;
        }

        if (run > end.getTime() || runs.length >= maxRuns) {
          return runs;
        }

        runs.push(new Date(run));
      }
    }
  }

  return runs;
}

export function shouldFinalizeRecurring(
  recurring: RecurringTransactionSchedule,
  now: Date
): boolean {
  if (!recurring.end_date || !isRecurringEnded(recurring, now)) {
    return false;
  }

  if (!recurring.last_run_at) {
    return true;
  }

  return (
    new Date(recurring.last_run_at).getTime() <=
    parseDateEnd(recurring.end_date).getTime()
  );
}

export function parseCron(expression: string): ParsedCron | null {
  const fields = expression.trim().split(/\s+/);

  if (fields.length !== 5) {
    return null;
  }

  const parsed = [
    parseCronField(fields[0], 0, 59),
    parseCronField(fields[1], 0, 23),
    parseCronField(fields[2], 1, 31),
    parseCronField(fields[3], 1, 12),
    parseCronField(fields[4], 0, 7),
  ] as const;

  return parsed.every((field) => field.size > 0) ? parsed : null;
}

export function parseDateStart(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function isRecurringEnded(
  recurring: RecurringTransactionSchedule,
  now: Date
): boolean {
  if (!recurring.end_date) {
    return false;
  }

  return now.getTime() > parseDateEnd(recurring.end_date).getTime();
}

function parseCronField(field: string, min: number, max: number): CronField {
  const values = new Set<number>();

  for (const part of field.split(',')) {
    const [rangePart, stepPart] = part.split('/');
    const step = stepPart ? Number(stepPart) : 1;

    if (!Number.isInteger(step) || step < 1) {
      continue;
    }

    const range =
      rangePart === '*'
        ? [min, max]
        : rangePart.includes('-')
        ? rangePart.split('-').map(Number)
        : [Number(rangePart), Number(rangePart)];

    const [start, end] = range;

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < min ||
      end > max ||
      start > end
    ) {
      continue;
    }

    for (let value = start; value <= end; value += step) {
      values.add(max === 7 && value === 7 ? 0 : value);
    }
  }

  return values;
}

function floorToMinute(value: Date): Date {
  const next = new Date(value);
  next.setUTCSeconds(0, 0);

  return next;
}

function parseDateEnd(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

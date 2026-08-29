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
  const runs: Date[] = [];

  for (
    let cursor = start;
    cursor <= end && runs.length < maxRuns;
    cursor = new Date(cursor.getTime() + 60_000)
  ) {
    if (matchesCron(cursor, schedule)) {
      runs.push(new Date(cursor));
    }
  }

  return runs;
}

export function shouldFinalizeRecurring(
  recurring: RecurringTransactionSchedule,
  now: Date
): boolean {
  if (!isRecurringEnded(recurring, now)) {
    return false;
  }

  if (!recurring.last_run_at) {
    return true;
  }

  return (
    new Date(recurring.last_run_at).getTime() <=
    parseDateEnd(recurring.end_date as string).getTime()
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

function matchesCron(
  value: Date,
  [minutes, hours, daysOfMonth, months, daysOfWeek]: ParsedCron
): boolean {
  return (
    minutes.has(value.getUTCMinutes()) &&
    hours.has(value.getUTCHours()) &&
    daysOfMonth.has(value.getUTCDate()) &&
    months.has(value.getUTCMonth() + 1) &&
    daysOfWeek.has(value.getUTCDay())
  );
}

function floorToMinute(value: Date): Date {
  const next = new Date(value);
  next.setUTCSeconds(0, 0);
  return next;
}

function parseDateEnd(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

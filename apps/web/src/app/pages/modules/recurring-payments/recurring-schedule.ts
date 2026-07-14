type CronSchedule = readonly [
  ReadonlySet<number>,
  ReadonlySet<number>,
  ReadonlySet<number>,
  ReadonlySet<number>,
  ReadonlySet<number>,
];

interface RecurringScheduleRange {
  readonly schedule: string;
  readonly startDate: Date;
  readonly endDate: Date | null;
}

export function nextScheduledOccurrence(
  recurring: RecurringScheduleRange,
  after: Date,
  searchThrough: Date,
): Date | null {
  const schedule = parseCron(recurring.schedule);
  if (!schedule) {
    return null;
  }

  const start = startOfDayUtc(recurring.startDate);
  const end = recurring.endDate ? endOfDayUtc(recurring.endDate) : null;
  let cursor = floorToMinute(
    new Date(Math.max(after.getTime() + 60_000, start.getTime())),
  );
  const maxDate = end && end.getTime() < searchThrough.getTime()
    ? end
    : searchThrough;

  while (cursor.getTime() <= maxDate.getTime()) {
    if (matchesCron(cursor, schedule)) {
      return cursor;
    }
    cursor = new Date(cursor.getTime() + 60_000);
  }

  return null;
}

export function countScheduledOccurrences(
  recurring: RecurringScheduleRange,
  after: Date,
  searchThrough: Date,
): number {
  let count = 0;
  let cursor = after;

  while (true) {
    const occurrence = nextScheduledOccurrence(recurring, cursor, searchThrough);
    if (!occurrence) {
      return count;
    }

    count += 1;
    cursor = occurrence;
  }
}

function parseCron(expression: string): CronSchedule | null {
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

function parseCronField(
  field: string,
  min: number,
  max: number,
): ReadonlySet<number> {
  const values = new Set<number>();

  for (const part of field.split(',')) {
    const [rangePart, stepPart] = part.split('/');
    const step = stepPart ? Number(stepPart) : 1;
    if (!Number.isInteger(step) || step < 1) {
      continue;
    }

    const range = rangePart === '*'
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
  [minutes, hours, daysOfMonth, months, daysOfWeek]: CronSchedule,
): boolean {
  return minutes.has(value.getUTCMinutes()) &&
    hours.has(value.getUTCHours()) &&
    daysOfMonth.has(value.getUTCDate()) &&
    months.has(value.getUTCMonth() + 1) &&
    daysOfWeek.has(value.getUTCDay());
}

function floorToMinute(value: Date): Date {
  const next = new Date(value);
  next.setUTCSeconds(0, 0);
  return next;
}

function startOfDayUtc(value: Date): Date {
  return new Date(Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
    0,
    0,
    0,
    0,
  ));
}

function endOfDayUtc(value: Date): Date {
  return new Date(Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
    23,
    59,
    59,
    999,
  ));
}

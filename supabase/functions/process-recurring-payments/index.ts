import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';

type RecurringTransaction = {
  id: string;
  schedule: string;
  start_date: string;
  end_date: string | null;
  last_run_at: string | null;
  is_paused: boolean;
};

type CronField = ReadonlySet<number>;
type RequestBody = {
  recurringId?: string;
  backfill?: boolean;
};

const DEFAULT_LOOKBACK_DAYS = 31;
const DEFAULT_MAX_RUNS = 100;

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  const body = await parseRequestBody(request);
  const configuredSecret = firstEnv('INTERNAL_FUNCTION_SECRET', 'ROUTINE_RUNNER_SECRET', 'RECURRING_PAYMENTS_SECRET');
  const isSecretAuthorized = !!configuredSecret && token === configuredSecret;
  const isSingleRecurringBackfill = !!body.recurringId;

  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('ANON_KEY');
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY') ??
    Deno.env.get('SB_SECRET_KEY');

  if (!serviceKey) {
    return json({ error: 'Missing Supabase service role key' }, 500);
  }

  const now = floorToMinute(new Date());
  const lookbackDays = positiveIntegerEnv('RECURRING_PAYMENTS_LOOKBACK_DAYS', DEFAULT_LOOKBACK_DAYS);
  const maxRuns = positiveIntegerEnv('RECURRING_PAYMENTS_MAX_RUNS', DEFAULT_MAX_RUNS);
  const earliest = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let ownerId: string | null = null;

  if (!isSecretAuthorized && (configuredSecret || isSingleRecurringBackfill)) {
    if (!isSingleRecurringBackfill || !anonKey || !authorization) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    ownerId = userData.user.id;
  }

  let query = supabase
    .from('recurring_transactions')
    .select('id,schedule,start_date,end_date,last_run_at,is_paused')
    .eq('is_paused', false);

  if (body.recurringId) {
    query = query.eq('id', body.recurringId);
  } else {
    query = query.lte('start_date', isoDate(now));
  }

  if (ownerId) {
    query = query.eq('owner_id', ownerId);
  }

  const { data, error } = await query;

  if (error) {
    return json({ error: error.message }, 500);
  }

  if (body.recurringId && (data ?? []).length === 0) {
    return json({ error: 'Recurring transaction not found' }, 404);
  }

  const processed: Array<{ recurringId: string; runAt: string; transactionId: string | null }> = [];
  const skipped: Array<{ recurringId: string; reason: string }> = [];

  for (const recurring of (data ?? []) as RecurringTransaction[]) {
    if (processed.length >= maxRuns) {
      skipped.push({ recurringId: recurring.id, reason: 'max_runs_reached' });
      continue;
    }

    if (shouldFinalizeRecurring(recurring, now)) {
      const { data: transactionId, error: rpcError } = await supabase.rpc('enqueue_recurring_transaction', {
        p_recurring_id: recurring.id,
        p_run_at: now.toISOString(),
      });

      if (rpcError) {
        skipped.push({ recurringId: recurring.id, reason: rpcError.message });
        continue;
      }

      processed.push({
        recurringId: recurring.id,
        runAt: now.toISOString(),
        transactionId: transactionId as string | null,
      });
      continue;
    }

    if (isRecurringEnded(recurring, now)) {
      continue;
    }

    const schedule = parseCron(recurring.schedule);
    if (!schedule) {
      skipped.push({ recurringId: recurring.id, reason: 'invalid_schedule' });
      continue;
    }

    const dueRuns = dueOccurrences(
      recurring,
      schedule,
      body.backfill || body.recurringId ? parseDateStart(recurring.start_date) : earliest,
      now,
      maxRuns - processed.length,
    );

    for (const runAt of dueRuns) {
      const { data: transactionId, error: rpcError } = await supabase.rpc('enqueue_recurring_transaction', {
        p_recurring_id: recurring.id,
        p_run_at: runAt.toISOString(),
      });

      if (rpcError) {
        skipped.push({ recurringId: recurring.id, reason: rpcError.message });
        continue;
      }

      processed.push({
        recurringId: recurring.id,
        runAt: runAt.toISOString(),
        transactionId: transactionId as string | null,
      });
    }
  }

  return json({
    processedCount: processed.length,
    skippedCount: skipped.length,
    processed,
    skipped,
    now: now.toISOString(),
    backfill: !!body.backfill || !!body.recurringId,
  });
});

function dueOccurrences(
  recurring: RecurringTransaction,
  schedule: readonly [CronField, CronField, CronField, CronField, CronField],
  earliest: Date,
  now: Date,
  maxRuns: number,
): Date[] {
  const startDate = parseDateStart(recurring.start_date);
  const lastRun = recurring.last_run_at ? new Date(recurring.last_run_at) : null;
  const start = floorToMinute(new Date(Math.max(
    earliest.getTime(),
    startDate.getTime(),
    lastRun ? lastRun.getTime() + 60_000 : startDate.getTime(),
  )));
  const endDate = recurring.end_date ? parseDateEnd(recurring.end_date) : now;
  const end = new Date(Math.min(now.getTime(), endDate.getTime()));
  const runs: Date[] = [];

  for (let cursor = start; cursor <= end && runs.length < maxRuns; cursor = new Date(cursor.getTime() + 60_000)) {
    if (matchesCron(cursor, schedule)) {
      runs.push(new Date(cursor));
    }
  }

  return runs;
}

function shouldFinalizeRecurring(recurring: RecurringTransaction, now: Date): boolean {
  if (!isRecurringEnded(recurring, now)) {
    return false;
  }

  if (!recurring.last_run_at) {
    return true;
  }

  return new Date(recurring.last_run_at).getTime() <= parseDateEnd(recurring.end_date as string).getTime();
}

function isRecurringEnded(recurring: RecurringTransaction, now: Date): boolean {
  if (!recurring.end_date) {
    return false;
  }

  return now.getTime() > parseDateEnd(recurring.end_date).getTime();
}

function parseCron(expression: string): readonly [CronField, CronField, CronField, CronField, CronField] | null {
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

function parseCronField(field: string, min: number, max: number): CronField {
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
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < min || end > max || start > end) {
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
  [minutes, hours, daysOfMonth, months, daysOfWeek]: readonly [CronField, CronField, CronField, CronField, CronField],
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

function parseDateStart(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function parseDateEnd(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function firstEnv(...names: string[]): string {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) {
      return value;
    }
  }

  return '';
}

function positiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(Deno.env.get(name) ?? fallback);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

async function parseRequestBody(request: Request): Promise<RequestBody> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return {};
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return {};
    }

    const candidate = body as Record<string, unknown>;
    return {
      recurringId: typeof candidate['recurringId'] === 'string' ? candidate['recurringId'] : undefined,
      backfill: candidate['backfill'] === true,
    };
  } catch {
    return {};
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

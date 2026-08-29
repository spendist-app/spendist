import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
import {
  dueOccurrences,
  parseCron,
  parseDateStart,
  shouldFinalizeRecurring,
} from './schedule.mts';

type RecurringTransaction = {
  id: string;
  schedule: string;
  start_date: string;
  end_date: string | null;
  last_run_at: string | null;
  is_paused: boolean;
};

type RequestBody = {
  recurringId?: string;
  backfill?: boolean;
};

const DEFAULT_LOOKBACK_DAYS = 31;
const DEFAULT_MAX_RUNS = 100;
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

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
    if (!isSingleRecurringBackfill || !authorization) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const authClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
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

    const schedule = parseCron(recurring.schedule);
    if (!schedule) {
      skipped.push({ recurringId: recurring.id, reason: 'invalid_schedule' });
      continue;
    }

    const remainingRuns = maxRuns - processed.length;
    const dueRunCandidates = dueOccurrences(
      recurring,
      schedule,
      body.backfill || body.recurringId
        ? parseDateStart(recurring.start_date)
        : earliest,
      now,
      remainingRuns + 1
    );
    const hasMoreDueRuns = dueRunCandidates.length > remainingRuns;
    const dueRuns = dueRunCandidates.slice(0, remainingRuns);
    let allDueRunsSucceeded = true;

    for (const runAt of dueRuns) {
      const { data: transactionId, error: rpcError } = await supabase.rpc(
        'enqueue_recurring_transaction',
        {
          p_recurring_id: recurring.id,
          p_run_at: runAt.toISOString(),
        }
      );

      if (rpcError) {
        skipped.push({ recurringId: recurring.id, reason: rpcError.message });
        allDueRunsSucceeded = false;
        break;
      }

      processed.push({
        recurringId: recurring.id,
        runAt: runAt.toISOString(),
        transactionId: transactionId as string | null,
      });
    }

    if (hasMoreDueRuns) {
      skipped.push({ recurringId: recurring.id, reason: 'max_runs_reached' });
      continue;
    }

    if (
      allDueRunsSucceeded &&
      shouldFinalizeRecurring(recurring, now) &&
      processed.length < maxRuns
    ) {
      const { data: transactionId, error: rpcError } = await supabase.rpc(
        'enqueue_recurring_transaction',
        {
          p_recurring_id: recurring.id,
          p_run_at: now.toISOString(),
        }
      );

      if (rpcError) {
        skipped.push({ recurringId: recurring.id, reason: rpcError.message });
        continue;
      }

      processed.push({
        recurringId: recurring.id,
        runAt: now.toISOString(),
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

function floorToMinute(value: Date): Date {
  const next = new Date(value);
  next.setUTCSeconds(0, 0);
  return next;
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
      ...CORS_HEADERS,
    },
  });
}

import { z } from 'npm:zod@4.4.3';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
import {
  dueOccurrences,
  parseCron,
  parseDateStart,
  shouldFinalizeRecurring,
} from './schedule.mts';
import { bearerSecretMatches } from '../_shared/internal-auth.ts';
import { withAllowedOrigin } from '../_shared/cors.ts';

const recurringTransactionSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  schedule: z.string(),
  start_date: z.string(),
  end_date: z.string().nullable(),
  last_run_at: z.string().nullable(),
  is_paused: z.boolean(),
});

type RequestBody = {
  recurringId?: string;
  backfill?: boolean;
};

const DEFAULT_LOOKBACK_DAYS = 31;

const DEFAULT_MAX_RUNS = 100;

// One account cannot use the whole run budget of a scheduled pass.
const DEFAULT_MAX_RUNS_PER_OWNER = 20;

// PostgREST returns at most 1000 rows per request.
const PAGE_SIZE = 1000;

const MAX_PAGES = 50;

const CORS_HEADERS = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request) =>
  withAllowedOrigin(request, await handleRequest(request))
);

async function handleRequest(request: Request): Promise<Response> {
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

  const configuredSecret = firstEnv(
    'INTERNAL_FUNCTION_SECRET',
    'ROUTINE_RUNNER_SECRET',
    'RECURRING_PAYMENTS_SECRET'
  );

  const isSecretAuthorized = bearerSecretMatches(
    request.headers.get('Authorization'),
    configuredSecret
  );

  const isSingleRecurringBackfill = !!body.recurringId;

  if (!isSecretAuthorized && !isSingleRecurringBackfill) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = requiredEnv('SUPABASE_URL');

  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY') ??
    Deno.env.get('SB_SECRET_KEY');

  if (!serviceKey) {
    return json({ error: 'Missing Supabase service role key' }, 500);
  }

  const now = floorToMinute(new Date());

  const lookbackDays = positiveIntegerEnv(
    'RECURRING_PAYMENTS_LOOKBACK_DAYS',
    DEFAULT_LOOKBACK_DAYS
  );

  const maxRuns = positiveIntegerEnv(
    'RECURRING_PAYMENTS_MAX_RUNS',
    DEFAULT_MAX_RUNS
  );

  // A single-schedule backfill belongs to one owner and keeps the full budget.
  const maxRunsPerOwner = body.recurringId
    ? maxRuns
    : positiveIntegerEnv(
        'RECURRING_PAYMENTS_MAX_RUNS_PER_OWNER',
        DEFAULT_MAX_RUNS_PER_OWNER
      );

  const earliest = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let ownerId: string | null = null;

  if (!isSecretAuthorized) {
    if (!token) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const authClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser(
      token
    );

    if (userError || !userData.user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    ownerId = userData.user.id;
  }

  // All pages are loaded before processing, so bookings that move a schedule's
  // last_run_at cannot shift rows between pages. Least recently run first keeps
  // schedules skipped by the budget at the front of the next pass.
  const data: unknown[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    let query = supabase
      .from('recurring_transactions')
      .select('id,owner_id,schedule,start_date,end_date,last_run_at,is_paused')
      .eq('is_paused', false);

    if (body.recurringId) {
      query = query.eq('id', body.recurringId);
    } else {
      query = query.lte('start_date', isoDate(now));
    }

    if (ownerId) {
      query = query.eq('owner_id', ownerId);
    }

    const { data: rows, error } = await query
      .order('last_run_at', { ascending: true, nullsFirst: true })
      .order('id', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('Failed to load recurring transactions', error.code);

      return json({ error: 'Failed to load recurring transactions' }, 500);
    }

    data.push(...(rows ?? []));

    if ((rows ?? []).length < PAGE_SIZE) {
      break;
    }
  }

  if (body.recurringId && data.length === 0) {
    return json({ error: 'Recurring transaction not found' }, 404);
  }

  const processed: Array<{
    recurringId: string;
    runAt: string;
    transactionId: string | null;
  }> = [];

  const skipped: Array<{ recurringId: string; reason: string }> = [];
  const runsByOwner = new Map<string, number>();

  for (const recurring of z.array(recurringTransactionSchema).parse(data)) {
    if (processed.length >= maxRuns) {
      skipped.push({ recurringId: recurring.id, reason: 'max_runs_reached' });
      continue;
    }

    const ownerRuns = runsByOwner.get(recurring.owner_id) ?? 0;

    if (ownerRuns >= maxRunsPerOwner) {
      skipped.push({
        recurringId: recurring.id,
        reason: 'owner_max_runs_reached',
      });
      continue;
    }

    const schedule = parseCron(recurring.schedule);

    if (!schedule) {
      skipped.push({ recurringId: recurring.id, reason: 'invalid_schedule' });
      continue;
    }

    const remainingRuns = Math.min(
      maxRuns - processed.length,
      maxRunsPerOwner - ownerRuns
    );

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
        console.error('Failed to enqueue recurring transaction', rpcError.code);
        skipped.push({ recurringId: recurring.id, reason: 'enqueue_failed' });
        allDueRunsSucceeded = false;
        break;
      }

      processed.push({
        recurringId: recurring.id,
        runAt: runAt.toISOString(),
        transactionId: z.string().nullable().parse(transactionId),
      });
      runsByOwner.set(
        recurring.owner_id,
        (runsByOwner.get(recurring.owner_id) ?? 0) + 1
      );
    }

    if (hasMoreDueRuns) {
      skipped.push({ recurringId: recurring.id, reason: 'max_runs_reached' });
      continue;
    }

    if (
      allDueRunsSucceeded &&
      shouldFinalizeRecurring(recurring, now) &&
      processed.length < maxRuns &&
      (runsByOwner.get(recurring.owner_id) ?? 0) < maxRunsPerOwner
    ) {
      const { data: transactionId, error: rpcError } = await supabase.rpc(
        'enqueue_recurring_transaction',
        {
          p_recurring_id: recurring.id,
          p_run_at: now.toISOString(),
        }
      );

      if (rpcError) {
        console.error('Failed to enqueue recurring transaction', rpcError.code);
        skipped.push({ recurringId: recurring.id, reason: 'enqueue_failed' });
        continue;
      }

      processed.push({
        recurringId: recurring.id,
        runAt: now.toISOString(),
        transactionId: z.string().nullable().parse(transactionId),
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
}

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
    return z
      .object({
        recurringId: z.string().optional().catch(undefined),
        backfill: z.boolean().catch(false).optional(),
      })
      .parse(await request.json());
  } catch {
    return {};
  }
}

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

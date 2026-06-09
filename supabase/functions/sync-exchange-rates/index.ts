import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';

type NbpTable = {
  no?: string;
  effectiveDate?: string;
  rates?: Array<{
    code?: string;
    mid?: number;
  }>;
};

type RequestBody = {
  startDate?: string;
  endDate?: string;
};

type ExchangeRateRow = {
  currency: string;
  rate_date: string;
  rate: number;
  source: 'nbp_table_a';
  source_no: string | null;
};

const NBP_TABLE = 'A';
const NBP_API_BASE_URL = 'https://api.nbp.pl/api/exchangerates/tables';
const FALLBACK_SYNC_START_DATE = '2026-06-01';
const MAX_RANGE_DAYS = 93;
const MAX_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 500;
const SUPPORTED_CURRENCIES = new Set([
  'USD',
  'EUR',
  'GBP',
  'CHF',
  'JPY',
  'CNY',
  'AUD',
  'CAD',
  'SEK',
  'NOK',
  'DKK',
  'CZK',
  'INR',
  'NZD',
]);

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const configuredSecret = Deno.env.get('EXCHANGE_RATES_SYNC_SECRET')?.trim();
  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!configuredSecret || token !== configuredSecret) {
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

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const body = await parseRequestBody(request);
  const today = startOfUtcDay(new Date());
  const yesterday = addDays(today, -1);
  const latestRateDate = await loadLatestRateDate(supabase);
  const defaultStart = latestRateDate
    ? maxDate(addDays(parseDate(latestRateDate), 1), parseDate(FALLBACK_SYNC_START_DATE))
    : parseDate(FALLBACK_SYNC_START_DATE);
  const startDate = body.startDate ? parseDate(body.startDate) : defaultStart;
  const endDate = body.endDate ? parseDate(body.endDate) : yesterday;

  if (startDate > endDate) {
    return json({
      processed: 0,
      insertedCount: 0,
      updatedCount: 0,
      rangeStart: isoDate(startDate),
      rangeEnd: isoDate(endDate),
      skipped: 'empty_range',
    });
  }

  const run = await createRun(supabase, startDate, endDate);

  try {
    const rows = await fetchRows(startDate, endDate);
    const result = rows.length > 0 ? await upsertRows(supabase, rows) : { insertedCount: 0, updatedCount: 0 };

    await finishRun(supabase, run.id, {
      status: 'succeeded',
      insertedCount: result.insertedCount,
      updatedCount: result.updatedCount,
      payload: { row_count: rows.length },
    });

    return json({
      runId: run.id,
      processed: rows.length,
      insertedCount: result.insertedCount,
      updatedCount: result.updatedCount,
      rangeStart: isoDate(startDate),
      rangeEnd: isoDate(endDate),
    });
  } catch (error) {
    const message = describeError(error);
    const payload = {
      run_id: run.id,
      range_start: isoDate(startDate),
      range_end: isoDate(endDate),
      source: 'nbp_table_a',
      error: message,
      occurred_at: new Date().toISOString(),
    };

    await finishRun(supabase, run.id, {
      status: 'failed',
      insertedCount: 0,
      updatedCount: 0,
      errorMessage: message,
      payload,
    });
    await notifyAdmins(supabase, payload);

    return json({ error: message, runId: run.id }, 502);
  }
});

async function fetchRows(startDate: Date, endDate: Date): Promise<ExchangeRateRow[]> {
  const rowsByKey = new Map<string, ExchangeRateRow>();
  for (const [start, end] of buildRanges(startDate, endDate)) {
    const tables = await fetchNbpRange(start, end);
    for (const table of tables) {
      if (!table.effectiveDate) {
        continue;
      }

      for (const rate of table.rates ?? []) {
        const currency = String(rate.code ?? '').toUpperCase();
        if (!SUPPORTED_CURRENCIES.has(currency) || typeof rate.mid !== 'number') {
          continue;
        }

        const row: ExchangeRateRow = {
          currency,
          rate_date: table.effectiveDate,
          rate: rate.mid,
          source: 'nbp_table_a',
          source_no: table.no ?? null,
        };
        rowsByKey.set(`${row.currency}:${row.rate_date}`, row);
      }
    }
  }

  return [...rowsByKey.values()].sort((a, b) => {
    const byDate = a.rate_date.localeCompare(b.rate_date);
    return byDate !== 0 ? byDate : a.currency.localeCompare(b.currency);
  });
}

async function fetchNbpRange(start: string, end: string): Promise<NbpTable[]> {
  const url = `${NBP_API_BASE_URL}/${NBP_TABLE}/${start}/${end}/?format=json`;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'spendist-exchange-rate-sync/1.0',
        },
      });

      if (response.status === 404) {
        return [];
      }

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`NBP ${response.status} ${response.statusText}: ${body.slice(0, 200)}`);
      }

      return await response.json() as NbpTable[];
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) {
        break;
      }
      await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  throw new Error(`Failed to fetch NBP range ${start}..${end}: ${describeError(lastError)}`);
}

async function loadLatestRateDate(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('rate_date')
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return typeof data?.rate_date === 'string' ? data.rate_date : null;
}

async function createRun(supabase: ReturnType<typeof createClient>, startDate: Date, endDate: Date) {
  const { data, error } = await supabase
    .from('exchange_rate_sync_runs')
    .insert({
      status: 'started',
      range_start: isoDate(startDate),
      range_end: isoDate(endDate),
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data as { id: string };
}

async function finishRun(
  supabase: ReturnType<typeof createClient>,
  runId: string,
  result: {
    status: 'succeeded' | 'failed';
    insertedCount: number;
    updatedCount: number;
    errorMessage?: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase
    .from('exchange_rate_sync_runs')
    .update({
      status: result.status,
      finished_at: new Date().toISOString(),
      inserted_count: result.insertedCount,
      updated_count: result.updatedCount,
      error_message: result.errorMessage ?? null,
      payload: result.payload ?? {},
    })
    .eq('id', runId);

  if (error) {
    console.error('[sync-exchange-rates] Failed to finish sync run', error);
  }
}

async function upsertRows(
  supabase: ReturnType<typeof createClient>,
  rows: ExchangeRateRow[],
): Promise<{ insertedCount: number; updatedCount: number }> {
  const existingKeys = new Set<string>();
  for (const chunk of chunkRows(rows, 1000)) {
    const dates = [...new Set(chunk.map((row) => row.rate_date))];
    const currencies = [...new Set(chunk.map((row) => row.currency))];
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('currency,rate_date')
      .in('rate_date', dates)
      .in('currency', currencies);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      existingKeys.add(`${row.currency}:${row.rate_date}`);
    }
  }

  for (const chunk of chunkRows(rows, 1000)) {
    const { error } = await supabase
      .from('exchange_rates')
      .upsert(chunk, { onConflict: 'currency,rate_date' });

    if (error) {
      throw error;
    }
  }

  const updatedCount = rows.filter((row) => existingKeys.has(`${row.currency}:${row.rate_date}`)).length;
  return {
    insertedCount: rows.length - updatedCount,
    updatedCount,
  };
}

async function notifyAdmins(supabase: ReturnType<typeof createClient>, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc('notify_admins_exchange_rates_sync_failed', {
    p_payload: payload,
  });

  if (error) {
    console.error('[sync-exchange-rates] Failed to notify admins', error);
  }
}

function buildRanges(startDate: Date, endDate: Date): Array<[string, string]> {
  const ranges: Array<[string, string]> = [];
  for (let cursor = startDate; cursor <= endDate; cursor = addDays(cursor, MAX_RANGE_DAYS)) {
    const rangeEnd = new Date(Math.min(addDays(cursor, MAX_RANGE_DAYS - 1).getTime(), endDate.getTime()));
    ranges.push([isoDate(cursor), isoDate(rangeEnd)]);
  }
  return ranges;
}

function chunkRows<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

async function parseRequestBody(request: Request): Promise<RequestBody> {
  const text = await request.text();
  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as RequestBody;
  } catch {
    return {};
  }
}

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date: ${value}`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || isoDate(date) !== value) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function maxDate(a: Date, b: Date): Date {
  return a > b ? a : b;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const NBP_TABLE = 'A';
const NBP_API_BASE_URL = 'https://api.nbp.pl/api/exchangerates/tables';
const DEFAULT_START_DATE = '2002-01-02';
const DEFAULT_END_DATE = '2026-05-31';
const DEFAULT_OUTPUT_PATH = resolve(
  'supabase',
  'migrations',
  '202606091231_seed_nbp_exchange_rates_to_2026_05_31.sql',
);
const CURRENCIES_PATH = resolve('apps', 'web', 'src', 'app', 'core', 'currencies.ts');
const MAX_RANGE_DAYS = 93;
const INSERT_BATCH_SIZE = 1000;
const MAX_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 500;

function parseArgs(argv) {
  const options = {
    start: DEFAULT_START_DATE,
    end: DEFAULT_END_DATE,
    output: DEFAULT_OUTPUT_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--start' && next) {
      options.start = next;
      index += 1;
    } else if (arg === '--end' && next) {
      options.end = next;
      index += 1;
    } else if (arg === '--output' && next) {
      options.output = resolve(next);
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return options;
}

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date: ${value}`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || isoDate(date) !== value) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function readSupportedCurrencies() {
  const source = readFileSync(CURRENCIES_PATH, 'utf8');
  const symbols = Array.from(source.matchAll(/symbol:\s*'([A-Z]{3})'/g), (match) => match[1])
    .filter((symbol) => symbol !== 'PLN');
  const unique = [...new Set(symbols)].sort();

  if (unique.length === 0) {
    throw new Error(`No currencies found in ${CURRENCIES_PATH}`);
  }

  return new Set(unique);
}

function buildRanges(startDate, endDate) {
  const ranges = [];
  for (let cursor = startDate; cursor <= endDate; cursor = addDays(cursor, MAX_RANGE_DAYS)) {
    const rangeEnd = new Date(Math.min(addDays(cursor, MAX_RANGE_DAYS - 1).getTime(), endDate.getTime()));
    ranges.push([isoDate(cursor), isoDate(rangeEnd)]);
  }
  return ranges;
}

async function fetchNbpRange(start, end) {
  const url = `${NBP_API_BASE_URL}/${NBP_TABLE}/${start}/${end}/?format=json`;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'spendist-exchange-rate-migration-generator/1.0',
        },
      });

      if (response.status === 404) {
        return [];
      }

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`NBP ${response.status} ${response.statusText}: ${body.slice(0, 200)}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) {
        break;
      }
      await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  throw new Error(`Failed to fetch NBP range ${start}..${end}: ${lastError?.message ?? lastError}`);
}

function delay(ms) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, ms);
  });
}

function collectRows(tables, supportedCurrencies) {
  const rows = [];

  for (const table of tables) {
    const rateDate = table.effectiveDate;
    const sourceNo = table.no ?? null;
    for (const rate of table.rates ?? []) {
      const currency = String(rate.code ?? '').toUpperCase();
      if (!supportedCurrencies.has(currency)) {
        continue;
      }

      rows.push({
        currency,
        rateDate,
        rate: Number(rate.mid),
        sourceNo,
      });
    }
  }

  return rows;
}

function sqlString(value) {
  if (value == null) {
    return 'null';
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

function renderSql(rows, options) {
  const rowsByKey = new Map();
  for (const row of rows) {
    rowsByKey.set(`${row.currency}:${row.rateDate}`, row);
  }

  const sortedRows = [...rowsByKey.values()].sort((a, b) => {
    const byDate = a.rateDate.localeCompare(b.rateDate);
    return byDate !== 0 ? byDate : a.currency.localeCompare(b.currency);
  });

  const batches = [];
  for (let index = 0; index < sortedRows.length; index += INSERT_BATCH_SIZE) {
    const batch = sortedRows.slice(index, index + INSERT_BATCH_SIZE);
    const values = batch
      .map((row) =>
        `  (${sqlString(row.currency)}, ${sqlString(row.rateDate)}::date, ${row.rate.toFixed(8)}, 'nbp_table_a', ${sqlString(row.sourceNo)})`,
      )
      .join(',\n');
    batches.push(`insert into public.exchange_rates (currency, rate_date, rate, source, source_no)\nvalues\n${values}\non conflict (currency, rate_date) do update set\n  rate = excluded.rate,\n  source = excluded.source,\n  source_no = excluded.source_no,\n  fetched_at = timezone('utc', now());`);
  }

  return `-- Generated by tools/scripts/generate-nbp-exchange-rate-migration.mjs on 2026-06-09.
-- Source: NBP table ${NBP_TABLE}, ${options.start}..${options.end}.
-- Unique rows: ${sortedRows.length}. Duplicate source rows skipped: ${rows.length - sortedRows.length}.
-- Rates are stored as PLN per one unit of currency.

${batches.join('\n\n')}
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const startDate = parseDate(options.start);
  const endDate = parseDate(options.end);
  if (startDate > endDate) {
    throw new Error(`Start date ${options.start} is after end date ${options.end}`);
  }

  const supportedCurrencies = readSupportedCurrencies();
  const ranges = buildRanges(startDate, endDate);
  const rows = [];

  for (const [start, end] of ranges) {
    console.log(`[nbp] Fetching ${start}..${end}`);
    const tables = await fetchNbpRange(start, end);
    rows.push(...collectRows(tables, supportedCurrencies));
  }

  if (rows.length === 0) {
    throw new Error('No exchange rate rows fetched.');
  }

  mkdirSync(dirname(options.output), { recursive: true });
  writeFileSync(options.output, renderSql(rows, options));
  const uniqueRows = new Set(rows.map((row) => `${row.currency}:${row.rateDate}`)).size;
  console.log(`[nbp] Wrote ${uniqueRows} unique rows to ${options.output}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

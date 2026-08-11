import type { TransactionDirection } from '@spendist/data-access/supabase-types';

export const SPENDIST_CSV_IMPORT_SOURCE = 'spendist_csv';

export const SPENDIST_CSV_HEADERS = [
  'id',
  'occurred_at',
  'description',
  'direction',
  'amount',
  'currency',
  'amount_in_default',
  'category_group',
  'category_path',
  'category',
  'wallet',
  'wallet_currency',
  'tags',
  'place',
  'is_automatic',
  'recurring_scheduled_for',
  'import_source',
  'imported_at',
] as const;

export type SpendistCsvHeader = (typeof SPENDIST_CSV_HEADERS)[number];

export interface SpendistCsvExportRow {
  readonly id: string;
  readonly occurred_at: string;
  readonly description: string;
  readonly direction: TransactionDirection;
  readonly amount: number;
  readonly currency: string;
  readonly amount_in_default: number;
  readonly category_group: string;
  readonly category_path: string;
  readonly category: string;
  readonly wallet: string;
  readonly wallet_currency: string;
  readonly tags: readonly string[];
  readonly place: string;
  readonly is_automatic: boolean;
  readonly recurring_scheduled_for: string;
  readonly import_source: string;
  readonly imported_at: string;
}

export interface SpendistCsvImportRow {
  readonly sourceRowNumber: number;
  readonly sourceId: string | null;
  readonly occurredAt: Date;
  readonly description: string | null;
  readonly direction: TransactionDirection;
  readonly amount: number;
  readonly currency: string;
  readonly amountInDefault: number;
  readonly categoryGroup: string;
  readonly categoryPath: readonly string[];
  readonly wallet: string;
  readonly walletCurrency: string | null;
  readonly tags: readonly string[];
  readonly place: string | null;
  readonly isAutomatic: boolean;
  readonly recurringScheduledFor: Date | null;
  readonly sourceImportSource: string | null;
  readonly sourceImportedAt: string | null;
  readonly fingerprint: string;
}

export interface SpendistCsvIssue {
  readonly rowNumber: number;
  readonly message: string;
}

export interface SpendistCsvParseResult {
  readonly rows: readonly SpendistCsvImportRow[];
  readonly totalDataRows: number;
  readonly issues: readonly SpendistCsvIssue[];
}

type ParsedCsvRecord = ReadonlyMap<string, string>;

const REQUIRED_IMPORT_HEADERS: readonly SpendistCsvHeader[] = [
  'occurred_at',
  'direction',
  'amount',
  'currency',
  'category_group',
  'category_path',
  'wallet',
];

export function generateSpendistCsv(rows: readonly SpendistCsvExportRow[]): string {
  const lines = [
    SPENDIST_CSV_HEADERS.join(','),
    ...rows.map((row) =>
      SPENDIST_CSV_HEADERS.map((header) => escapeCsvCell(formatExportValue(row, header))).join(','),
    ),
  ];

  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function parseSpendistCsv(text: string): SpendistCsvParseResult {
  const records = parseCsvRecords(stripBom(text));
  const [headerRow, ...dataRows] = records;
  if (!headerRow) {
    return {
      rows: [],
      totalDataRows: 0,
      issues: [{ rowNumber: 1, message: 'The CSV file is empty.' }],
    };
  }

  const headers = headerRow.map((header) => normalizeHeader(header));
  const headerSet = new Set(headers);
  const missing = REQUIRED_IMPORT_HEADERS.filter((header) => !headerSet.has(header));
  if (missing.length > 0) {
    return {
      rows: [],
      totalDataRows: 0,
      issues: [
        {
          rowNumber: 1,
          message: `Missing required columns: ${missing.join(', ')}.`,
        },
      ],
    };
  }

  const rows: SpendistCsvImportRow[] = [];
  const issues: SpendistCsvIssue[] = [];
  let totalDataRows = 0;

  dataRows.forEach((values, index) => {
    const sourceRowNumber = index + 2;
    if (!values.some((value) => value.trim().length > 0)) {
      return;
    }

    totalDataRows += 1;
    const record = buildRecord(headers, values);
    const parsed = parseImportRecord(record, sourceRowNumber);
    if ('issue' in parsed) {
      issues.push(parsed.issue);
    } else {
      rows.push(parsed.row);
    }
  });

  return { rows, totalDataRows, issues };
}

export function createSpendistCsvFingerprint(input: {
  readonly occurredAt: Date;
  readonly description: string | null;
  readonly direction: TransactionDirection;
  readonly amount: number;
  readonly currency: string;
  readonly categoryPath: readonly string[];
  readonly wallet: string;
  readonly tags: readonly string[];
}): string {
  const normalized = [
    input.occurredAt.toISOString(),
    input.direction,
    roundAmount(input.amount).toFixed(2),
    normalizeCurrency(input.currency) ?? '',
    normalizeNullableText(input.description) ?? '',
    input.categoryPath.map((part) => normalizeLookupKey(part)).join('/'),
    normalizeLookupKey(input.wallet),
    [...input.tags].map(normalizeLookupKey).sort().join(';'),
  ].join('|');

  return `spendist:${hashString(normalized)}`;
}

function parseImportRecord(
  record: ParsedCsvRecord,
  sourceRowNumber: number,
): { row: SpendistCsvImportRow } | { issue: SpendistCsvIssue } {
  const occurredAt = parseIsoDate(read(record, 'occurred_at'));
  if (!occurredAt) {
    return { issue: { rowNumber: sourceRowNumber, message: 'Invalid occurred_at value.' } };
  }

  const direction = parseDirection(read(record, 'direction'));
  if (!direction) {
    return { issue: { rowNumber: sourceRowNumber, message: 'Invalid direction value.' } };
  }

  const amount = parseAmount(read(record, 'amount'));
  if (amount === null) {
    return { issue: { rowNumber: sourceRowNumber, message: 'Invalid amount value.' } };
  }

  const currency = normalizeCurrency(read(record, 'currency'));
  if (!currency) {
    return { issue: { rowNumber: sourceRowNumber, message: 'Invalid currency value.' } };
  }

  const categoryGroup = normalizeNullableText(read(record, 'category_group'));
  if (!categoryGroup) {
    return { issue: { rowNumber: sourceRowNumber, message: 'Missing category_group value.' } };
  }

  const categoryPath = parseCategoryPath(read(record, 'category_path'));
  if (categoryPath.length === 0) {
    return { issue: { rowNumber: sourceRowNumber, message: 'Missing category_path value.' } };
  }
  if (categoryPath.length > 3) {
    return { issue: { rowNumber: sourceRowNumber, message: 'category_path supports up to 3 levels.' } };
  }

  const wallet = normalizeNullableText(read(record, 'wallet'));
  if (!wallet) {
    return { issue: { rowNumber: sourceRowNumber, message: 'Missing wallet value.' } };
  }

  const amountInDefault = parseAmount(read(record, 'amount_in_default')) ?? amount;
  const walletCurrency = normalizeCurrency(read(record, 'wallet_currency'));
  const description = normalizeNullableText(unescapeFormulaValue(read(record, 'description')));
  const sourceId = normalizeNullableText(read(record, 'id'));
  const tags = parseTags(read(record, 'tags'));
  const place = normalizeNullableText(unescapeFormulaValue(read(record, 'place')));
  const isAutomatic = parseBoolean(read(record, 'is_automatic'));
  const recurringScheduledFor = parseOptionalIsoDate(read(record, 'recurring_scheduled_for'));
  const sourceImportSource = normalizeNullableText(read(record, 'import_source'));
  const sourceImportedAt = normalizeNullableText(read(record, 'imported_at'));
  const fingerprint = createSpendistCsvFingerprint({
    occurredAt,
    description,
    direction,
    amount,
    currency,
    categoryPath,
    wallet,
    tags,
  });

  return {
    row: {
      sourceRowNumber,
      sourceId,
      occurredAt,
      description,
      direction,
      amount,
      currency,
      amountInDefault,
      categoryGroup,
      categoryPath,
      wallet,
      walletCurrency,
      tags,
      place,
      isAutomatic,
      recurringScheduledFor,
      sourceImportSource,
      sourceImportedAt,
      fingerprint,
    },
  };
}

function parseCsvRecords(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (character === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
      continue;
    }

    if (character === ',') {
      row.push(cell);
      cell = '';
      continue;
    }

    if (character === '\n') {
      row.push(trimCarriageReturn(cell));
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += character;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(trimCarriageReturn(cell));
    rows.push(row);
  }

  return rows;
}

function buildRecord(headers: readonly string[], values: readonly string[]): ParsedCsvRecord {
  const record = new Map<string, string>();
  headers.forEach((header, index) => {
    record.set(header, values[index] ?? '');
  });
  return record;
}

function formatExportValue(row: SpendistCsvExportRow, header: SpendistCsvHeader): string {
  const value = row[header];
  if (Array.isArray(value)) {
    return value.join('; ');
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  return typeof value === 'string' ? value : '';
}

function escapeCsvCell(value: string): string {
  const safeValue = escapeFormulaValue(value);
  if (/[",\r\n]/.test(safeValue)) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }
  return safeValue;
}

function escapeFormulaValue(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function unescapeFormulaValue(value: string): string {
  return /^'[=+\-@]/.test(value) ? value.slice(1) : value;
}

function parseCategoryPath(value: string): readonly string[] {
  return value
    .split('/')
    .map((part) => normalizeNullableText(part))
    .filter((part): part is string => !!part);
}

function parseTags(value: string): readonly string[] {
  return Array.from(
    new Set(
      value
        .split(';')
        .map((tag) => normalizeNullableText(tag))
        .filter((tag): tag is string => !!tag),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

function parseDirection(value: string): TransactionDirection | null {
  const normalized = value.trim().toLowerCase();
  return normalized === 'expense' || normalized === 'income' ? normalized : null;
}

function parseBoolean(value: string): boolean {
  return ['true', '1', 'yes', 'y'].includes(value.trim().toLowerCase());
}

function parseIsoDate(value: string): Date | null {
  const normalized = normalizeNullableText(value);
  if (!normalized) {
    return null;
  }
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseOptionalIsoDate(value: string): Date | null {
  const normalized = normalizeNullableText(value);
  return normalized ? parseIsoDate(normalized) : null;
}

function parseAmount(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? roundAmount(parsed) : null;
}

function normalizeCurrency(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function normalizeNullableText(value: string | null | undefined): string | null {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeHeader(value: string): string {
  return stripBom(value).trim().toLowerCase();
}

function read(record: ParsedCsvRecord, header: SpendistCsvHeader): string {
  return record.get(header) ?? '';
}

function roundAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function trimCarriageReturn(value: string): string {
  return value.endsWith('\r') ? value.slice(0, -1) : value;
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

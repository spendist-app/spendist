import type { TransactionDirection } from '@spendist/data-access/supabase-types';

export const KONTOMIERZ_IMPORT_SOURCE = 'kontomierz';
export const KONTOMIERZ_SHEET_NAME = 'Kontomierz';
export const KONTOMIERZ_FALLBACK_CATEGORY = 'Brak kategorii';

export interface KontomierzWorksheet {
  readonly name: string;
  readonly rows: readonly (readonly unknown[])[];
}

export interface KontomierzImportRow {
  readonly sourceRowNumber: number;
  readonly occurredAt: Date;
  readonly amount: number;
  readonly amountInDefault: number;
  readonly currency: string;
  readonly direction: TransactionDirection;
  readonly title: string;
  readonly description: string | null;
  readonly groupName: string;
  readonly categoryName: string;
  readonly walletName: string;
  readonly tagNames: readonly string[];
  readonly isSplitParent: boolean;
  readonly isSplitChild: boolean;
  readonly originalDate: string | null;
  readonly originalAmount: number | null;
  readonly originalTitle: string | null;
  readonly fingerprint: string;
  readonly metadata: KontomierzImportMetadata;
}

export interface KontomierzImportMetadata {
  readonly source_row_number: number;
  readonly source_wallet_name: string;
  readonly source_group_name: string;
  readonly source_category_name: string;
  readonly is_split_child: boolean;
  readonly original_date: string | null;
  readonly original_amount: number | null;
  readonly original_title: string | null;
  readonly raw_tags: readonly string[];
}

export interface KontomierzParseIssue {
  readonly rowNumber: number;
  readonly message: string;
}

export interface KontomierzParseResult {
  readonly rows: readonly KontomierzImportRow[];
  readonly skippedSplitParents: number;
  readonly totalDataRows: number;
  readonly issues: readonly KontomierzParseIssue[];
}

type HeaderKey =
  | 'Data'
  | 'Kwota'
  | 'Waluta'
  | 'Tytuł'
  | 'Grupa kategorii'
  | 'Kategoria'
  | 'Nazwa konta/portfela'
  | 'Kwota w PLN'
  | 'Tagi'
  | 'Komentarz'
  | 'Podzielona'
  | 'Podtransakcja'
  | 'Oryginalna data transakcji'
  | 'Oryginalna kwota transakcji'
  | 'Oryginalny tytuł transakcji';

const REQUIRED_HEADERS: readonly HeaderKey[] = [
  'Data',
  'Kwota',
  'Waluta',
  'Tytuł',
  'Grupa kategorii',
  'Kategoria',
  'Nazwa konta/portfela',
];

const OPTIONAL_HEADERS: readonly HeaderKey[] = [
  'Kwota w PLN',
  'Tagi',
  'Komentarz',
  'Podzielona',
  'Podtransakcja',
  'Oryginalna data transakcji',
  'Oryginalna kwota transakcji',
  'Oryginalny tytuł transakcji',
];

const ALL_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];

export function parseKontomierzWorksheet(worksheet: KontomierzWorksheet): KontomierzParseResult {
  if (worksheet.name !== KONTOMIERZ_SHEET_NAME) {
    return {
      rows: [],
      skippedSplitParents: 0,
      totalDataRows: 0,
      issues: [
        {
          rowNumber: 1,
          message: `Expected worksheet "${KONTOMIERZ_SHEET_NAME}".`,
        },
      ],
    };
  }

  const [headerRow, ...dataRows] = worksheet.rows;
  if (!headerRow) {
    return {
      rows: [],
      skippedSplitParents: 0,
      totalDataRows: 0,
      issues: [{ rowNumber: 1, message: 'The worksheet is empty.' }],
    };
  }

  const headerIndexes = buildHeaderIndexes(headerRow);
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headerIndexes.has(header));
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      skippedSplitParents: 0,
      totalDataRows: 0,
      issues: [
        {
          rowNumber: 1,
          message: `Missing required columns: ${missingHeaders.join(', ')}.`,
        },
      ],
    };
  }

  const rows: KontomierzImportRow[] = [];
  const issues: KontomierzParseIssue[] = [];
  let skippedSplitParents = 0;
  let totalDataRows = 0;

  for (let index = 0; index < dataRows.length; index += 1) {
    const sourceRowNumber = index + 2;
    const row = dataRows[index];
    if (!row.some((value) => value != null && String(value).trim().length > 0)) {
      continue;
    }

    totalDataRows += 1;

    const isSplitParent = isAffirmative(readCell(row, headerIndexes, 'Podzielona'));
    const isSplitChild = isAffirmative(readCell(row, headerIndexes, 'Podtransakcja'));
    if (isSplitParent && !isSplitChild) {
      skippedSplitParents += 1;
      continue;
    }

    const parsedRow = parseDataRow(row, headerIndexes, sourceRowNumber, isSplitParent, isSplitChild);
    if ('issue' in parsedRow) {
      issues.push(parsedRow.issue);
    } else {
      rows.push(parsedRow.row);
    }
  }

  return {
    rows,
    skippedSplitParents,
    totalDataRows,
    issues,
  };
}

function parseDataRow(
  row: readonly unknown[],
  headerIndexes: ReadonlyMap<HeaderKey, number>,
  sourceRowNumber: number,
  isSplitParent: boolean,
  isSplitChild: boolean,
): { row: KontomierzImportRow } | { issue: KontomierzParseIssue } {
  const occurredAt = parseKontomierzDate(readCell(row, headerIndexes, 'Data'));
  if (!occurredAt) {
    return { issue: { rowNumber: sourceRowNumber, message: 'Invalid transaction date.' } };
  }

  const signedAmount = parseAmount(readCell(row, headerIndexes, 'Kwota'));
  if (signedAmount === null || signedAmount === 0) {
    return { issue: { rowNumber: sourceRowNumber, message: 'Invalid transaction amount.' } };
  }

  const currency = normalizeCurrency(readCell(row, headerIndexes, 'Waluta'));
  if (!currency) {
    return { issue: { rowNumber: sourceRowNumber, message: 'Invalid transaction currency.' } };
  }

  const title = normalizeText(readCell(row, headerIndexes, 'Tytuł'));
  if (!title) {
    return { issue: { rowNumber: sourceRowNumber, message: 'Missing transaction title.' } };
  }

  const amountInDefault = Math.abs(parseAmount(readCell(row, headerIndexes, 'Kwota w PLN')) ?? signedAmount);
  const amount = Math.abs(signedAmount);
  const direction: TransactionDirection = signedAmount < 0 ? 'expense' : 'income';
  const groupName = normalizeText(readCell(row, headerIndexes, 'Grupa kategorii')) ?? KONTOMIERZ_FALLBACK_CATEGORY;
  const categoryName = normalizeText(readCell(row, headerIndexes, 'Kategoria')) ?? KONTOMIERZ_FALLBACK_CATEGORY;
  const walletName = normalizeText(readCell(row, headerIndexes, 'Nazwa konta/portfela')) ?? '';
  const comment = normalizeText(readCell(row, headerIndexes, 'Komentarz'));
  const tagNames = parseTags(readCell(row, headerIndexes, 'Tagi'));
  const originalDate = normalizeText(readCell(row, headerIndexes, 'Oryginalna data transakcji'));
  const originalAmount = parseAmount(readCell(row, headerIndexes, 'Oryginalna kwota transakcji'));
  const originalTitle = normalizeText(readCell(row, headerIndexes, 'Oryginalny tytuł transakcji'));
  const description = buildDescription(title, comment);
  const fingerprint = createKontomierzFingerprint({
    occurredAt,
    amount,
    amountInDefault,
    currency,
    direction,
    title,
    groupName,
    categoryName,
    walletName,
    sourceRowNumber,
    originalDate,
    originalAmount,
    originalTitle,
  });

  return {
    row: {
      sourceRowNumber,
      occurredAt,
      amount,
      amountInDefault,
      currency,
      direction,
      title,
      description,
      groupName,
      categoryName,
      walletName,
      tagNames,
      isSplitParent,
      isSplitChild,
      originalDate,
      originalAmount,
      originalTitle,
      fingerprint,
      metadata: {
        source_row_number: sourceRowNumber,
        source_wallet_name: walletName,
        source_group_name: groupName,
        source_category_name: categoryName,
        is_split_child: isSplitChild,
        original_date: originalDate,
        original_amount: originalAmount,
        original_title: originalTitle,
        raw_tags: tagNames,
      },
    },
  };
}

function buildHeaderIndexes(headerRow: readonly unknown[]): ReadonlyMap<HeaderKey, number> {
  const normalizedHeaders = new Map<string, number>();
  headerRow.forEach((header, index) => {
    const key = normalizeText(header);
    if (key) {
      normalizedHeaders.set(key, index);
    }
  });

  const result = new Map<HeaderKey, number>();
  for (const header of ALL_HEADERS) {
    const index = normalizedHeaders.get(header);
    if (index != null) {
      result.set(header, index);
    }
  }

  return result;
}

function readCell(row: readonly unknown[], headerIndexes: ReadonlyMap<HeaderKey, number>, header: HeaderKey): unknown {
  const index = headerIndexes.get(header);
  return index == null ? null : row[index];
}

function buildDescription(title: string, comment: string | null): string {
  if (!comment) {
    return title;
  }

  return `${title}\n\nKomentarz z Kontomierza: ${comment}`;
}

function normalizeText(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCurrency(value: unknown): string | null {
  const normalized = normalizeText(value)?.toUpperCase() ?? null;
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function parseAmount(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? roundAmount(value) : null;
  }

  const normalized = String(value).replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? roundAmount(parsed) : null;
}

function parseKontomierzDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toUtcDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }

  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(normalized);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  return toUtcDate(year, month, day);
}

function toUtcDate(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return date;
}

function parseTags(value: unknown): readonly string[] {
  const raw = normalizeText(value);
  if (!raw) {
    return [];
  }

  return Array.from(
    new Set(
      raw
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

function isAffirmative(value: unknown): boolean {
  return normalizeText(value)?.toLowerCase() === 'tak';
}

function roundAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

function createKontomierzFingerprint(input: {
  readonly occurredAt: Date;
  readonly amount: number;
  readonly amountInDefault: number;
  readonly currency: string;
  readonly direction: TransactionDirection;
  readonly title: string;
  readonly groupName: string;
  readonly categoryName: string;
  readonly walletName: string;
  readonly sourceRowNumber: number;
  readonly originalDate: string | null;
  readonly originalAmount: number | null;
  readonly originalTitle: string | null;
}): string {
  const parts = [
    formatIsoDate(input.occurredAt),
    input.direction,
    input.amount.toFixed(2),
    input.amountInDefault.toFixed(2),
    input.currency,
    input.title,
    input.groupName,
    input.categoryName,
    input.walletName,
    String(input.sourceRowNumber),
    input.originalDate ?? '',
    input.originalAmount?.toFixed(2) ?? '',
    input.originalTitle ?? '',
  ];

  return `kontomierz:v1:${hashFingerprint(parts.map((part) => part.trim().toLowerCase()).join('|'))}`;
}

function formatIsoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`;
}

function hashFingerprint(value: string): string {
  let hash1 = 0xdeadbeef ^ value.length;
  let hash2 = 0x41c6ce57 ^ value.length;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    hash1 = Math.imul(hash1 ^ code, 2654435761);
    hash2 = Math.imul(hash2 ^ code, 1597334677);
  }

  hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507) ^ Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
  hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507) ^ Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);

  const combined = 4294967296 * (2097151 & hash2) + (hash1 >>> 0);
  return combined.toString(36);
}

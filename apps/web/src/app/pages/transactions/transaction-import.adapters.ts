import {
  SPENDIST_CSV_IMPORT_SOURCE,
  createSpendistCsvFingerprint,
  parseSpendistCsv,
} from '../settings/spendist-csv-transfer.parser';
import {
  TRANSACTION_IMPORT_MAX_ROWS,
  TransactionImportAdapter,
  TransactionImportDetection,
  TransactionImportDraftBatch,
  TransactionImportDraftRow,
  TransactionImportError,
  TransactionImportFormat,
} from './transaction-import.models';

const BIEDRONKA_IMPORT_SOURCE = 'biedronka_e_receipt' as const;

export const TRANSACTION_IMPORT_ADAPTERS: readonly TransactionImportAdapter[] =
  [
    {
      id: SPENDIST_CSV_IMPORT_SOURCE,
      labelKey: 'transactions.import.formats.csv.title',
      descriptionKey: 'transactions.import.formats.csv.description',
      accept: '.csv,text/csv',
      supportsPaste: true,
      matches: looksLikeSpendistCsv,
      parse: parseCsvImport,
    },
    {
      id: BIEDRONKA_IMPORT_SOURCE,
      labelKey: 'transactions.import.formats.biedronka.title',
      descriptionKey: 'transactions.import.formats.biedronka.description',
      accept: '.json,application/json',
      supportsPaste: false,
      matches: looksLikeBiedronkaReceipt,
      parse: parseBiedronkaImport,
    },
  ];

export function transactionImportAdapter(
  id: TransactionImportFormat
): TransactionImportAdapter {
  const adapter = TRANSACTION_IMPORT_ADAPTERS.find((item) => item.id === id);
  if (!adapter) {
    throw new TransactionImportError(
      'Unsupported import format.',
      'invalid_file'
    );
  }
  return adapter;
}

export function detectTransactionImport(
  text: string
): TransactionImportDetection {
  const normalized = stripBom(text).trim();
  const adapter = TRANSACTION_IMPORT_ADAPTERS.find((item) =>
    item.matches(normalized)
  );
  if (!adapter) {
    return {
      status: 'invalid',
      format: 'unknown',
      error: new TransactionImportError(
        'The file format is not supported.',
        'unknown_format'
      ),
    };
  }

  try {
    return {
      status: 'valid',
      format: adapter.id,
      batch: adapter.parse(normalized),
    };
  } catch (error) {
    return {
      status: 'invalid',
      format: adapter.id,
      error:
        error instanceof TransactionImportError
          ? error
          : new TransactionImportError(
              'The file could not be parsed.',
              'invalid_file'
            ),
    };
  }
}

function looksLikeSpendistCsv(text: string): boolean {
  const header = stripBom(text).split(/\r?\n/, 1)[0]?.toLowerCase() ?? '';
  const headers = new Set(
    header.split(',').map((value) => value.trim().replace(/^"|"$/g, ''))
  );
  if (!headers.has('occurred_at')) return false;

  const signatures = [
    'direction',
    'amount',
    'currency',
    'category_group',
    'category_path',
    'wallet',
  ];
  return signatures.filter((value) => headers.has(value)).length >= 3;
}

function looksLikeBiedronkaReceipt(text: string): boolean {
  let receipt: unknown;
  try {
    receipt = JSON.parse(text);
  } catch {
    return false;
  }
  if (!isRecord(receipt)) return false;
  if ('IDZ' in receipt) return true;

  return arrayRecords(receipt['body']).some(
    (entry) =>
      'sellLine' in entry ||
      'discountLine' in entry ||
      'sumInCurrency' in entry ||
      'fiscalFooter' in entry
  );
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function parseCsvImport(text: string): TransactionImportDraftBatch {
  const result = parseSpendistCsv(text);
  if (result.issues.length > 0 || result.rows.length !== result.totalDataRows) {
    const issue = result.issues[0];
    throw new TransactionImportError(
      issue
        ? `Row ${issue.rowNumber}: ${issue.message}`
        : 'The CSV file is invalid.',
      'invalid_file'
    );
  }
  assertRowLimit(result.rows.length);
  if (result.rows.length === 0) {
    throw new TransactionImportError(
      'The CSV file contains no transactions.',
      'invalid_file'
    );
  }

  const directions = new Set(result.rows.map((row) => row.direction));
  if (directions.size !== 1) {
    throw new TransactionImportError(
      'All CSV rows must have the same direction.',
      'mixed_direction'
    );
  }
  const wallets = new Map(
    result.rows.map((row) => [normalize(row.wallet), row.wallet] as const)
  );
  if (wallets.size !== 1) {
    throw new TransactionImportError(
      'All CSV rows must use the same wallet.',
      'mixed_wallet'
    );
  }

  return {
    format: SPENDIST_CSV_IMPORT_SOURCE,
    direction: result.rows[0].direction,
    walletName: result.rows[0].wallet,
    rows: result.rows.map(
      (row): TransactionImportDraftRow => ({
        occurredAt: row.occurredAt,
        description: row.description ?? '',
        amount: row.amount,
        currency: row.currency,
        categoryPath: row.categoryPath,
        categoryId: '',
        tags: row.tags,
        placeId: '',
        importContext: {
          source: SPENDIST_CSV_IMPORT_SOURCE,
          fingerprint:
            row.fingerprint ||
            createSpendistCsvFingerprint({
              occurredAt: row.occurredAt,
              description: row.description,
              direction: row.direction,
              amount: row.amount,
              currency: row.currency,
              categoryPath: row.categoryPath,
              wallet: row.wallet,
              tags: row.tags,
            }),
          metadata: {
            source: SPENDIST_CSV_IMPORT_SOURCE,
            sourceRow: row.sourceRowNumber,
            sourceId: row.sourceId,
            sourceImportSource: row.sourceImportSource,
            sourceImportedAt: row.sourceImportedAt,
            categoryPath: row.categoryPath,
            tags: row.tags,
            wallet: row.wallet,
            walletCurrency: row.walletCurrency,
          },
          isAutomatic: row.isAutomatic,
          recurringScheduledFor: row.recurringScheduledFor,
          sourceAmountInDefault: row.amountInDefault,
        },
      })
    ),
  };
}

function parseBiedronkaImport(text: string): TransactionImportDraftBatch {
  let receipt: unknown;
  try {
    receipt = JSON.parse(text);
  } catch {
    throw new TransactionImportError(
      'The JSON file is invalid.',
      'invalid_receipt'
    );
  }
  if (!isRecord(receipt) || !Array.isArray(receipt['body'])) {
    throw new TransactionImportError(
      'The e-receipt structure is invalid.',
      'invalid_receipt'
    );
  }

  const date = receiptDate(receipt);
  const currency = receiptCurrency(receipt);
  const receiptId = receiptIdentifier(receipt);
  const fiscalTotal = receiptFiscalTotal(receipt);
  if (!date || !currency || !receiptId || fiscalTotal === null) {
    throw new TransactionImportError(
      'The e-receipt is missing required data.',
      'invalid_receipt'
    );
  }

  const rows: TransactionImportDraftRow[] = [];
  let current: { row: TransactionImportDraftRow; netCents: number } | null =
    null;
  for (const entry of receipt['body']) {
    if (!isRecord(entry)) continue;
    if (isRecord(entry['sellLine'])) {
      if (current) rows.push(withAmount(current.row, current.netCents));
      const line = entry['sellLine'];
      if (line['isStorno'] === true) {
        throw new TransactionImportError(
          'Storno lines are not supported.',
          'invalid_receipt'
        );
      }
      const total = positiveInteger(line['total']);
      const price = positiveInteger(line['price']);
      const name = stringValue(line['name'])?.trim();
      const quantity = stringValue(line['quantity'])?.trim();
      if (total === null || price === null || !name || !quantity) {
        throw new TransactionImportError(
          'A receipt item is invalid.',
          'invalid_receipt'
        );
      }
      const index = rows.length;
      current = {
        netCents: total,
        row: {
          occurredAt: date,
          description: `${name.replace(/\s+/g, ' ')} · ${quantity} × ${money(
            price
          )} ${currency}`,
          amount: total / 100,
          currency,
          categoryPath: [],
          categoryId: '',
          tags: [],
          placeId: '',
          importContext: {
            source: BIEDRONKA_IMPORT_SOURCE,
            fingerprint: `biedronka:${hash(
              `${receiptId}|${index}|${name}|${total}`
            )}`,
            metadata: {
              receiptId,
              line: index + 1,
              quantity,
              unitPrice: price / 100,
            },
            isAutomatic: false,
            recurringScheduledFor: null,
            sourceAmountInDefault: total / 100,
          },
        },
      };
      continue;
    }
    if (isRecord(entry['discountLine'])) {
      if (!current || entry['discountLine']['isStorno'] === true) {
        throw new TransactionImportError(
          'A receipt discount is invalid.',
          'invalid_receipt'
        );
      }
      const discount = positiveInteger(entry['discountLine']['value']);
      if (discount === null || entry['discountLine']['isDiscount'] !== true) {
        throw new TransactionImportError(
          'A receipt discount is invalid.',
          'invalid_receipt'
        );
      }
      current.netCents -= discount;
      if (current.netCents <= 0) {
        throw new TransactionImportError(
          'A receipt item has a non-positive total.',
          'invalid_receipt'
        );
      }
    }
  }
  if (current) rows.push(withAmount(current.row, current.netCents));
  assertRowLimit(rows.length);
  if (
    rows.length === 0 ||
    rows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) !==
      fiscalTotal
  ) {
    throw new TransactionImportError(
      'Receipt item totals do not match its fiscal total.',
      'invalid_receipt'
    );
  }

  return {
    format: BIEDRONKA_IMPORT_SOURCE,
    direction: 'expense',
    walletName: null,
    rows,
  };
}

function withAmount(
  row: TransactionImportDraftRow,
  cents: number
): TransactionImportDraftRow {
  return {
    ...row,
    amount: cents / 100,
    importContext: { ...row.importContext, sourceAmountInDefault: cents / 100 },
  };
}

function receiptDate(receipt: Record<string, unknown>): Date | null {
  const header = arrayRecords(receipt['header']).find((entry) =>
    isRecord(entry['headerData'])
  );
  const footer = arrayRecords(receipt['body']).find((entry) =>
    isRecord(entry['fiscalFooter'])
  );
  const raw = isRecord(header?.['headerData'])
    ? stringValue(header['headerData']['date'])
    : isRecord(footer?.['fiscalFooter'])
    ? stringValue(footer['fiscalFooter']['date'])
    : null;
  if (!raw) return null;
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? null : value;
}

function receiptCurrency(receipt: Record<string, unknown>): string | null {
  for (const entry of arrayRecords(receipt['body'])) {
    const value = isRecord(entry['sumInCurrency'])
      ? stringValue(entry['sumInCurrency']['currency'])
      : null;
    if (value && /^[A-Z]{3}$/.test(value.toUpperCase()))
      return value.toUpperCase();
  }
  return null;
}

function receiptFiscalTotal(receipt: Record<string, unknown>): number | null {
  for (const entry of arrayRecords(receipt['body'])) {
    const value = isRecord(entry['sumInCurrency'])
      ? positiveInteger(entry['sumInCurrency']['fiscalTotal'])
      : null;
    if (value !== null) return value;
  }
  return null;
}

function receiptIdentifier(receipt: Record<string, unknown>): string | null {
  const idz = stringValue(receipt['IDZ']);
  if (idz) return idz;
  for (const entry of arrayRecords(receipt['body'])) {
    const footer = entry['fiscalFooter'];
    if (isRecord(footer)) {
      const unique = stringValue(footer['uniqueNumber']);
      const bill =
        typeof footer['billNumber'] === 'number' ? footer['billNumber'] : null;
      if (unique && bill !== null) return `${unique}:${bill}`;
    }
  }
  return null;
}

function assertRowLimit(count: number): void {
  if (count > TRANSACTION_IMPORT_MAX_ROWS) {
    throw new TransactionImportError(
      `An import can contain at most ${TRANSACTION_IMPORT_MAX_ROWS} rows.`,
      'row_limit'
    );
  }
}

function arrayRecords(value: unknown): readonly Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null;
}
function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('pl-PL').replace(/\s+/g, ' ');
}
function money(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, '0');
}

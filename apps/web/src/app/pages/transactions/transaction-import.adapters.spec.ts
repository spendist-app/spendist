import { describe, expect, it } from 'vitest';
import {
  detectTransactionImport,
  transactionImportAdapter,
} from './transaction-import.adapters';
import { TransactionImportError } from './transaction-import.models';

const CSV_HEADER =
  'id,occurred_at,description,direction,amount,currency,amount_in_default,category_group,category_path,category,wallet,wallet_currency,tags,is_automatic,recurring_scheduled_for,import_source,imported_at';

function csvRow(overrides: Partial<Record<string, string>> = {}): string {
  const values: Record<string, string> = {
    id: 'source-1',
    occurred_at: '2026-08-01T12:00:00.000Z',
    description: 'Groceries',
    direction: 'expense',
    amount: '12.50',
    currency: 'PLN',
    amount_in_default: '12.50',
    category_group: 'Home',
    category_path: 'Food',
    category: 'Food',
    wallet: 'Main wallet',
    wallet_currency: 'PLN',
    tags: 'weekly',
    is_automatic: 'false',
    recurring_scheduled_for: '',
    import_source: '',
    imported_at: '',
    ...overrides,
  };
  return CSV_HEADER.split(',')
    .map((header) => values[header] ?? '')
    .join(',');
}

function receipt(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    IDZ: 'receipt-123',
    header: [{ headerData: { date: '2026-08-01T12:00:00.000Z' } }],
    body: [
      {
        sellLine: {
          name: 'Banan Luz C',
          price: 699,
          total: 664,
          quantity: '0,950',
          isStorno: false,
        },
      },
      { discountLine: { value: 64, isDiscount: true, isStorno: false } },
      { sumInCurrency: { currency: 'PLN', fiscalTotal: 600 } },
    ],
    data: 'ignored signed payload',
    sign: 'ignored signature',
    ...overrides,
  });
}

describe('transaction import adapters', () => {
  it('detects supported formats from their content', () => {
    const csv = detectTransactionImport(`\uFEFF${CSV_HEADER}\n${csvRow()}`);
    const biedronka = detectTransactionImport(`  ${receipt()}  `);

    expect(csv).toMatchObject({
      status: 'valid',
      format: 'spendist_csv',
    });
    expect(biedronka).toMatchObject({
      status: 'valid',
      format: 'biedronka_e_receipt',
    });
  });

  it('keeps a recognized format when its contents fail validation', () => {
    const csv = detectTransactionImport(
      `${CSV_HEADER}\n${csvRow({ amount: 'not-a-number' })}`
    );
    const invalidReceipt = JSON.parse(receipt()) as Record<string, unknown>;
    delete invalidReceipt['header'];
    const biedronka = detectTransactionImport(JSON.stringify(invalidReceipt));

    expect(csv).toMatchObject({
      status: 'invalid',
      format: 'spendist_csv',
      error: { code: 'invalid_file' },
    });
    expect(biedronka).toMatchObject({
      status: 'invalid',
      format: 'biedronka_e_receipt',
      error: { code: 'invalid_receipt' },
    });
  });

  it('labels unrelated JSON and text as unknown', () => {
    expect(detectTransactionImport('{"items":[]}')).toMatchObject({
      status: 'invalid',
      format: 'unknown',
      error: { code: 'unknown_format' },
    });
    expect(detectTransactionImport('ordinary text')).toMatchObject({
      status: 'invalid',
      format: 'unknown',
      error: { code: 'unknown_format' },
    });
  });

  it('parses Spendist CSV and preserves source fidelity', () => {
    const batch = transactionImportAdapter('spendist_csv').parse(
      `${CSV_HEADER}\n${csvRow()}`
    );
    expect(batch.walletName).toBe('Main wallet');
    expect(batch.direction).toBe('expense');
    expect(batch.rows[0]).toMatchObject({
      amount: 12.5,
      currency: 'PLN',
      categoryGroup: 'Home',
      categoryPath: ['Food'],
    });
    expect(batch.rows[0].importContext.sourceAmountInDefault).toBe(12.5);
  });

  it('rejects CSV batches with mixed wallets or directions', () => {
    expect(() =>
      transactionImportAdapter('spendist_csv').parse(
        `${CSV_HEADER}\n${csvRow()}\n${csvRow({ wallet: 'Cash' })}`
      )
    ).toThrowError(TransactionImportError);
    expect(() =>
      transactionImportAdapter('spendist_csv').parse(
        `${CSV_HEADER}\n${csvRow()}\n${csvRow({ direction: 'income' })}`
      )
    ).toThrowError(TransactionImportError);
  });

  it('limits interactive imports to 500 rows', () => {
    const rows = Array.from({ length: 501 }, (_, index) =>
      csvRow({ id: `source-${index}`, description: `Row ${index}` })
    );
    expect(() =>
      transactionImportAdapter('spendist_csv').parse(
        `${CSV_HEADER}\n${rows.join('\n')}`
      )
    ).toThrowError(TransactionImportError);
  });

  it('turns a Biedronka item and following discount into one expense', () => {
    const batch = transactionImportAdapter('biedronka_e_receipt').parse(
      receipt()
    );
    expect(batch.rows).toHaveLength(1);
    expect(batch.rows[0].amount).toBe(6);
    expect(batch.rows[0].description).toBe('Banan Luz C · 0,950 × 6,99 PLN');
    expect(batch.rows[0].importContext.metadata).not.toHaveProperty('data');
    expect(batch.rows[0].importContext.metadata).not.toHaveProperty('sign');
  });

  it('rejects storno and inconsistent Biedronka totals', () => {
    const storno = JSON.parse(receipt()) as {
      body: Array<Record<string, Record<string, unknown>>>;
    };
    storno.body[0]['sellLine']['isStorno'] = true;
    expect(() =>
      transactionImportAdapter('biedronka_e_receipt').parse(
        JSON.stringify(storno)
      )
    ).toThrowError(TransactionImportError);

    const inconsistent = JSON.parse(receipt()) as {
      body: Array<Record<string, Record<string, unknown>>>;
    };
    inconsistent.body[2]['sumInCurrency']['fiscalTotal'] = 601;
    expect(() =>
      transactionImportAdapter('biedronka_e_receipt').parse(
        JSON.stringify(inconsistent)
      )
    ).toThrowError(TransactionImportError);
  });
});

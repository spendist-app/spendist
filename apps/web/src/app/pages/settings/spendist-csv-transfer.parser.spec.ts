import { describe, expect, it } from 'vitest';

import {
  SPENDIST_CSV_HEADERS,
  createSpendistCsvFingerprint,
  generateSpendistCsv,
  parseSpendistCsv,
} from './spendist-csv-transfer.parser';

describe('Spendist CSV transfer parser', () => {
  it('generates stable headers and escapes CSV cells', () => {
    const csv = generateSpendistCsv([
      {
        id: 'tx-1',
        occurred_at: '2026-02-03T00:00:00.000Z',
        description: '=SUM(A1:A2), "quoted"\nnext line',
        direction: 'expense',
        amount: 12.34,
        currency: 'PLN',
        amount_in_default: 12.34,
        category_group: 'Food',
        category_path: 'Food/Groceries',
        category: 'Groceries',
        wallet: 'Main',
        wallet_currency: 'PLN',
        tags: ['home', 'weekly'],
        place: 'Biedronka',
        is_automatic: false,
        recurring_scheduled_for: '',
        import_source: '',
        imported_at: '',
      },
    ]);

    const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
    expect(lines[0]).toBe(SPENDIST_CSV_HEADERS.join(','));
    expect(csv).toContain('"\'=SUM(A1:A2), ""quoted""\nnext line"');
    expect(csv).toContain('home; weekly');
  });

  it('parses exported Spendist CSV back to import rows', () => {
    const csv = generateSpendistCsv([
      {
        id: 'tx-1',
        occurred_at: '2026-02-03T00:00:00.000Z',
        description: 'Lunch',
        direction: 'expense',
        amount: 25,
        currency: 'PLN',
        amount_in_default: 25,
        category_group: 'Food',
        category_path: 'Food/Groceries',
        category: 'Groceries',
        wallet: 'Main',
        wallet_currency: 'PLN',
        tags: ['lunch', 'work'],
        place: 'Biedronka',
        is_automatic: false,
        recurring_scheduled_for: '',
        import_source: '',
        imported_at: '',
      },
    ]);

    const result = parseSpendistCsv(csv);

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      sourceRowNumber: 2,
      sourceId: 'tx-1',
      description: 'Lunch',
      direction: 'expense',
      amount: 25,
      currency: 'PLN',
      amountInDefault: 25,
      categoryGroup: 'Food',
      categoryPath: ['Food', 'Groceries'],
      wallet: 'Main',
      walletCurrency: 'PLN',
      tags: ['lunch', 'work'],
      place: 'Biedronka',
      isAutomatic: false,
    });
  });

  it('reports missing required headers', () => {
    const result = parseSpendistCsv('occurred_at,amount\n2026-02-01,10\n');

    expect(result.rows).toEqual([]);
    expect(result.issues[0]?.message).toContain('Missing required columns');
    expect(result.issues[0]?.message).toContain('direction');
  });

  it('accepts earlier CSV files that do not contain the optional place column', () => {
    const headers = SPENDIST_CSV_HEADERS.filter((header) => header !== 'place');
    const csv = [
      headers.join(','),
      'tx-1,2026-02-01T00:00:00.000Z,Lunch,expense,10,PLN,10,Food,Food/Groceries,Groceries,Main,PLN,weekly,false,,,',
    ].join('\n');

    const result = parseSpendistCsv(csv);

    expect(result.issues).toEqual([]);
    expect(result.rows[0]?.place).toBeNull();
  });

  it('reports invalid data rows without dropping valid rows', () => {
    const csv = [
      SPENDIST_CSV_HEADERS.join(','),
      'tx-1,not-a-date,Lunch,expense,10,PLN,10,Food,Food/Groceries,Groceries,Main,PLN,,,',
      'tx-2,2026-02-01T00:00:00.000Z,Salary,income,100,PLN,100,Work,Work,Work,Main,PLN,,,',
    ].join('\n');

    const result = parseSpendistCsv(csv);

    expect(result.totalDataRows).toBe(2);
    expect(result.rows).toHaveLength(1);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({ rowNumber: 2 });
  });

  it('creates stable duplicate fingerprints independent of tag order', () => {
    const first = createSpendistCsvFingerprint({
      occurredAt: new Date('2026-02-01T00:00:00.000Z'),
      description: 'Lunch',
      direction: 'expense',
      amount: 10,
      currency: 'pln',
      categoryPath: ['Food', 'Groceries'],
      wallet: 'Main',
      tags: ['work', 'lunch'],
    });
    const second = createSpendistCsvFingerprint({
      occurredAt: new Date('2026-02-01T00:00:00.000Z'),
      description: 'Lunch',
      direction: 'expense',
      amount: 10,
      currency: 'PLN',
      categoryPath: ['Food', 'Groceries'],
      wallet: 'Main',
      tags: ['lunch', 'work'],
    });

    expect(first).toBe(second);
  });

  it('gives repeated rows stable unique fingerprints', () => {
    const row = {
      id: 'tx-1',
      occurred_at: '2026-02-01T00:00:00.000Z',
      description: 'Lunch',
      direction: 'expense' as const,
      amount: 10,
      currency: 'PLN',
      amount_in_default: 10,
      category_group: 'Food',
      category_path: 'Food/Groceries',
      category: 'Groceries',
      wallet: 'Main',
      wallet_currency: 'PLN',
      tags: ['weekly'],
      place: '',
      is_automatic: false,
      recurring_scheduled_for: '',
      import_source: '',
      imported_at: '',
    };
    const csv = generateSpendistCsv([row, row]);

    const first = parseSpendistCsv(csv);
    const second = parseSpendistCsv(csv);

    expect(first.issues).toEqual([]);
    expect(first.rows).toHaveLength(2);
    expect(first.rows[0].fingerprint).not.toBe(first.rows[1].fingerprint);
    expect(first.rows.map((item) => item.fingerprint)).toEqual(
      second.rows.map((item) => item.fingerprint),
    );
    expect(first.rows[1].fingerprint).toBe(
      `${first.rows[0].fingerprint}:2`,
    );
  });
});

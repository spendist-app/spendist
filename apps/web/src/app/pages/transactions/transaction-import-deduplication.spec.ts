import { describe, expect, it } from 'vitest';
import type { TransactionImportContext } from './transaction-import.models';
import { excludePreviouslyImportedTransactions } from './transaction-import-deduplication';

const repeatedImportContext: TransactionImportContext = {
  source: 'spendist_csv',
  fingerprint: 'same-product-and-unit-price',
  metadata: {},
  isAutomatic: false,
  recurringScheduledFor: null,
  sourceAmountInDefault: 17.39,
};

describe('transaction import deduplication', () => {
  it('keeps identical rows together during their first import', () => {
    const rows = [
      { importContext: repeatedImportContext, row: 1 },
      { importContext: repeatedImportContext, row: 2 },
      { importContext: repeatedImportContext, row: 3 },
      { importContext: repeatedImportContext, row: 4 },
    ];

    expect(excludePreviouslyImportedTransactions(rows, new Set())).toEqual(
      rows
    );
  });

  it('skips every matching row when the fingerprint already exists', () => {
    const rows = [
      { importContext: repeatedImportContext },
      { importContext: repeatedImportContext },
    ];
    const existing = new Set([
      `${repeatedImportContext.source}|${repeatedImportContext.fingerprint}`,
    ]);

    expect(excludePreviouslyImportedTransactions(rows, existing)).toEqual([]);
  });

  it('does not deduplicate ordinary manually entered transactions', () => {
    const rows = [{ row: 1 }, { row: 2 }];

    expect(excludePreviouslyImportedTransactions(rows, new Set())).toEqual(
      rows
    );
  });
});

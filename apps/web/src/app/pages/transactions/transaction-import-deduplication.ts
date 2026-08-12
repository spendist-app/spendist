import type { TransactionImportContext } from './transaction-import.models';

interface TransactionWithImportContext {
  readonly importContext?: TransactionImportContext;
}

export function excludePreviouslyImportedTransactions<
  T extends TransactionWithImportContext,
>(
  transactions: readonly T[],
  existingCounts: ReadonlyMap<string, number>
): readonly T[] {
  const remainingExisting = new Map(existingCounts);
  return transactions.filter((transaction) => {
    const context = transaction.importContext;
    if (!context) return true;
    const key = `${context.source}|${context.fingerprint}`;
    const remaining = remainingExisting.get(key) ?? 0;
    if (remaining === 0) return true;
    remainingExisting.set(key, remaining - 1);
    return false;
  });
}

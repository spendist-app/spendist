import type { TransactionImportContext } from './transaction-import.models';

interface TransactionWithImportContext {
  readonly importContext?: TransactionImportContext;
}

export function excludePreviouslyImportedTransactions<
  T extends TransactionWithImportContext,
>(transactions: readonly T[], existingKeys: ReadonlySet<string>): readonly T[] {
  return transactions.filter((transaction) => {
    const context = transaction.importContext;
    if (!context) return true;
    return !existingKeys.has(`${context.source}|${context.fingerprint}`);
  });
}

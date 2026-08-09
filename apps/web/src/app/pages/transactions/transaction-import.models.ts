import type { TransactionDirection } from '@spendist/data-access/supabase-types';

export const TRANSACTION_IMPORT_MAX_ROWS = 500;

export type TransactionImportFormat = 'spendist_csv' | 'biedronka_e_receipt';
export type TransactionImportDetectedFormat =
  | TransactionImportFormat
  | 'unknown';

export interface TransactionImportContext {
  readonly source: TransactionImportFormat;
  readonly fingerprint: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly isAutomatic: boolean;
  readonly recurringScheduledFor: Date | null;
  readonly sourceAmountInDefault: number | null;
}

export interface TransactionImportDraftRow {
  readonly occurredAt: Date;
  readonly description: string;
  readonly amount: number;
  readonly currency: string;
  readonly categoryPath: readonly string[];
  readonly categoryId: string;
  readonly tags: readonly string[];
  readonly placeId: string;
  readonly importContext: TransactionImportContext;
}

export interface TransactionImportDraftBatch {
  readonly format: TransactionImportFormat;
  readonly direction: TransactionDirection;
  readonly walletName: string | null;
  readonly rows: readonly TransactionImportDraftRow[];
}

export interface TransactionBulkPrefill {
  readonly mode: 'import';
  readonly walletId: string;
  readonly direction: TransactionDirection;
  readonly rows: readonly TransactionImportDraftRow[];
  readonly duplicatesSkipped: number;
}

export interface TransactionImportAdapter {
  readonly id: TransactionImportFormat;
  readonly labelKey: string;
  readonly descriptionKey: string;
  readonly accept: string;
  readonly supportsPaste: boolean;
  matches(text: string): boolean;
  parse(text: string): TransactionImportDraftBatch;
}

export type TransactionImportDetection =
  | {
      readonly status: 'valid';
      readonly format: TransactionImportFormat;
      readonly batch: TransactionImportDraftBatch;
    }
  | {
      readonly status: 'invalid';
      readonly format: TransactionImportDetectedFormat;
      readonly error: TransactionImportError;
    };

export class TransactionImportError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'invalid_file'
      | 'invalid_receipt'
      | 'unknown_format'
      | 'mixed_direction'
      | 'mixed_wallet'
      | 'row_limit'
  ) {
    super(message);
    this.name = 'TransactionImportError';
  }
}

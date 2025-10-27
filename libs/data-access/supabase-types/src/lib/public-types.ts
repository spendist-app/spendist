import type { Database } from '../generated/database.types';

type PublicTables = Database['public']['Tables'];
type PublicViews = Database['public']['Views'];
type PublicEnums = Database['public']['Enums'];

export type TransactionRow = PublicTables['transactions']['Row'];
export type TransactionInsert = PublicTables['transactions']['Insert'];
export type TransactionUpdate = PublicTables['transactions']['Update'];

export type TransactionTagRow = PublicTables['transaction_tags']['Row'];
export type TagRow = PublicTables['tags']['Row'];

export type CategoryRow = PublicTables['categories']['Row'];
export type CategoryInsert = PublicTables['categories']['Insert'];
export type CategoryUpdate = PublicTables['categories']['Update'];

export type CategoryGroupRow = PublicTables['categories_group']['Row'];
export type CategoryGroupInsert = PublicTables['categories_group']['Insert'];
export type CategoryGroupUpdate = PublicTables['categories_group']['Update'];

export type WalletRow = PublicTables['wallets']['Row'];
export type WalletInsert = PublicTables['wallets']['Insert'];
export type WalletUpdate = PublicTables['wallets']['Update'];

export type ProfileRow = PublicTables['profiles']['Row'];

export type RecurringTransactionRow = PublicTables['recurring_transactions']['Row'];
export type RecurringTransactionInsert = PublicTables['recurring_transactions']['Insert'];
export type RecurringTransactionUpdate = PublicTables['recurring_transactions']['Update'];

export type RecurringTransactionsOverviewRow = PublicViews['recurring_transactions_overview']['Row'];

export type TransactionDirection = PublicEnums['transaction_direction'];

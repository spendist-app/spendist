import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import type {
  CategoryGroupInsert,
  CategoryGroupRow,
  CategoryInsert,
  CategoryRow,
  Json,
  TagRow,
  TransactionInsert,
  TransactionRow,
  TransactionTagRow,
  WalletInsert,
  WalletRow,
  Tables,
} from '@spendist/data-access/supabase-types';

import { AuthService } from '../../core/auth.service';
import { SUPABASE_CLIENT } from '../../core/supabase';
import { SettingsStore } from './settings.store';
import {
  SPENDIST_CSV_IMPORT_SOURCE,
  SpendistCsvExportRow,
  SpendistCsvImportRow,
  SpendistCsvIssue,
  generateSpendistCsv,
  parseSpendistCsv,
} from './spendist-csv-transfer.parser';

type CurrencyRow = Tables<'currencies'>;

export interface SpendistCsvExportFilters {
  readonly month: string | null;
  readonly categoryIds: readonly string[];
}

export interface SpendistCsvExportResult {
  readonly fileName: string;
  readonly csv: string;
  readonly exported: number;
}

export interface SpendistCsvImportSummary {
  readonly fileName: string;
  readonly totalDataRows: number;
  readonly parsedTransactions: number;
  readonly duplicates: number;
  readonly importableTransactions: number;
  readonly newGroups: readonly string[];
  readonly newCategories: readonly string[];
  readonly newWallets: readonly string[];
  readonly newTags: readonly string[];
  readonly issues: readonly SpendistCsvIssue[];
}

interface SpendistPreparedImport {
  readonly fileName: string;
  readonly rows: readonly SpendistCsvImportRow[];
  readonly importableRows: readonly SpendistCsvImportRow[];
  readonly summary: SpendistCsvImportSummary;
}

interface SpendistCsvTransferState {
  readonly exporting: boolean;
  readonly analyzing: boolean;
  readonly importing: boolean;
  readonly progress: number;
  readonly exported: number;
  readonly imported: number;
  readonly duplicatesSkipped: number;
  readonly error: string | null;
  readonly summary: SpendistCsvImportSummary | null;
  readonly prepared: SpendistPreparedImport | null;
}

interface TransferLookups {
  readonly groups: readonly CategoryGroupRow[];
  readonly categories: readonly CategoryRow[];
  readonly wallets: readonly WalletRow[];
  readonly tags: readonly TagRow[];
  readonly currencies: readonly CurrencyRow[];
}

const PAGE_SIZE = 1000;
const INSERT_BATCH_SIZE = 500;
const IN_FILTER_BATCH_SIZE = 500;

@Injectable()
export class SpendistCsvTransferStore {
  private readonly supabase = inject<SupabaseClient>(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);
  private readonly settingsStore = inject(SettingsStore);

  private readonly state = signal<SpendistCsvTransferState>({
    exporting: false,
    analyzing: false,
    importing: false,
    progress: 0,
    exported: 0,
    imported: 0,
    duplicatesSkipped: 0,
    error: null,
    summary: null,
    prepared: null,
  });

  readonly exporting = computed(() => this.state().exporting);
  readonly analyzing = computed(() => this.state().analyzing);
  readonly importing = computed(() => this.state().importing);
  readonly progress = computed(() => this.state().progress);
  readonly exported = computed(() => this.state().exported);
  readonly imported = computed(() => this.state().imported);
  readonly duplicatesSkipped = computed(() => this.state().duplicatesSkipped);
  readonly error = computed(() => this.state().error);
  readonly summary = computed(() => this.state().summary);
  readonly canImport = computed(() => {
    const state = this.state();
    return !state.analyzing && !state.importing && (state.prepared?.importableRows.length ?? 0) > 0;
  });

  clear(): void {
    this.state.set({
      exporting: false,
      analyzing: false,
      importing: false,
      progress: 0,
      exported: 0,
      imported: 0,
      duplicatesSkipped: 0,
      error: null,
      summary: null,
      prepared: null,
    });
  }

  async exportCsv(filters: SpendistCsvExportFilters): Promise<SpendistCsvExportResult> {
    const userId = this.requireUserId('settings.panels.spendistCsv.errors.authRequired');
    this.state.update((state) => ({
      ...state,
      exporting: true,
      exported: 0,
      error: null,
    }));

    try {
      const lookups = await this.loadLookups(userId);
      const categoryIds = this.expandCategoryIds(filters.categoryIds, lookups.categories);
      const transactions = await this.loadTransactionsForExport(userId, filters.month, categoryIds);
      const tagRows = await this.loadTransactionTagRows(userId, transactions.map((transaction) => transaction.id));
      const rows = this.mapExportRows(transactions, tagRows, lookups);
      const result = {
        fileName: buildExportFileName(filters.month, categoryIds.length > 0),
        csv: generateSpendistCsv(rows),
        exported: rows.length,
      };

      this.state.update((state) => ({
        ...state,
        exporting: false,
        exported: rows.length,
        error: null,
      }));
      return result;
    } catch (error) {
      this.state.update((state) => ({
        ...state,
        exporting: false,
        error: describeTransferError(error, 'settings.panels.spendistCsv.errors.exportFailed'),
      }));
      throw error;
    }
  }

  async analyzeFile(file: File): Promise<void> {
    const userId = this.requireUserId('settings.panels.spendistCsv.errors.authRequired');
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.setError('settings.panels.spendistCsv.errors.unsupportedFile');
      return;
    }

    this.state.update((state) => ({
      ...state,
      analyzing: true,
      importing: false,
      progress: 0,
      imported: 0,
      duplicatesSkipped: 0,
      error: null,
      summary: null,
      prepared: null,
    }));

    try {
      const [text, lookups] = await Promise.all([file.text(), this.loadLookups(userId)]);
      const parseResult = parseSpendistCsv(text);
      const currencySymbols = new Set(lookups.currencies.map((currency) => currency.symbol.toUpperCase()));
      const validation = this.validateImportRows(parseResult.rows, lookups, currencySymbols);
      const rows = parseResult.rows.filter((row) => !validation.rejectedRowNumbers.has(row.sourceRowNumber));
      const duplicateFingerprints = await this.loadExistingFingerprints(rows);
      const importableRows = rows.filter((row) => !duplicateFingerprints.has(row.fingerprint));
      const summary: SpendistCsvImportSummary = {
        fileName: file.name,
        totalDataRows: parseResult.totalDataRows,
        parsedTransactions: rows.length,
        duplicates: duplicateFingerprints.size,
        importableTransactions: importableRows.length,
        newGroups: validation.newGroups,
        newCategories: validation.newCategories,
        newWallets: validation.newWallets,
        newTags: validation.newTags,
        issues: [...parseResult.issues, ...validation.issues].sort((a, b) => a.rowNumber - b.rowNumber),
      };

      this.state.update((state) => ({
        ...state,
        analyzing: false,
        error: null,
        summary,
        prepared: {
          fileName: file.name,
          rows,
          importableRows,
          summary,
        },
      }));
    } catch (error) {
      this.state.update((state) => ({
        ...state,
        analyzing: false,
        error: describeTransferError(error, 'settings.panels.spendistCsv.errors.analyzeFailed'),
      }));
    }
  }

  async importPrepared(): Promise<void> {
    const userId = this.requireUserId('settings.panels.spendistCsv.errors.authRequired');
    const prepared = this.state().prepared;
    if (!prepared || prepared.importableRows.length === 0) {
      return;
    }

    this.state.update((state) => ({
      ...state,
      importing: true,
      progress: 0,
      imported: 0,
      duplicatesSkipped: 0,
      error: null,
    }));

    try {
      const groups = await this.ensureGroups(userId, prepared.rows);
      const categories = await this.ensureCategories(userId, prepared.rows, groups);
      const wallets = await this.ensureWallets(userId, prepared.rows);
      const tags = await this.ensureTags(userId, prepared.rows);

      let imported = 0;
      let duplicatesSkipped = 0;
      for (let index = 0; index < prepared.importableRows.length; index += INSERT_BATCH_SIZE) {
        const batch = prepared.importableRows.slice(index, index + INSERT_BATCH_SIZE);
        const freshDuplicates = await this.loadExistingFingerprints(batch);
        const rowsToInsert = batch.filter((row) => !freshDuplicates.has(row.fingerprint));
        duplicatesSkipped += freshDuplicates.size;

        if (rowsToInsert.length > 0) {
          const inserted = await this.insertTransactions(userId, rowsToInsert, categories, wallets);
          await this.insertTransactionTags(userId, rowsToInsert, inserted, tags);
          imported += inserted.length;
        }

        this.state.update((state) => ({
          ...state,
          imported,
          duplicatesSkipped,
          progress: Math.round(((index + batch.length) / prepared.importableRows.length) * 100),
        }));
      }

      await this.settingsStore.refresh();
      this.state.update((state) => ({
        ...state,
        importing: false,
        progress: 100,
        summary: state.summary
          ? {
              ...state.summary,
              duplicates: state.summary.duplicates + duplicatesSkipped,
              importableTransactions: Math.max(0, state.summary.importableTransactions - duplicatesSkipped),
            }
          : state.summary,
      }));
    } catch (error) {
      this.state.update((state) => ({
        ...state,
        importing: false,
        error: describeTransferError(error, 'settings.panels.spendistCsv.errors.importFailed'),
      }));
    }
  }

  private async loadTransactionsForExport(
    userId: string,
    month: string | null,
    categoryIds: readonly string[],
  ): Promise<readonly TransactionRow[]> {
    const rows: TransactionRow[] = [];
    let page = 0;
    while (true) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = this.supabase
        .from('transactions')
        .select('*')
        .eq('owner_id', userId)
        .order('occurred_at', { ascending: true })
        .range(from, to);

      const range = month ? monthRange(month) : null;
      if (range) {
        query = query.gte('occurred_at', range.from).lte('occurred_at', range.to);
      }
      if (categoryIds.length > 0) {
        query = query.in('category_id', [...categoryIds]);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      const pageRows = (data ?? []) as TransactionRow[];
      rows.push(...pageRows);
      this.state.update((state) => ({ ...state, exported: rows.length }));
      if (pageRows.length < PAGE_SIZE) {
        return rows;
      }
      page += 1;
    }
  }

  private async loadLookups(userId: string): Promise<TransferLookups> {
    const [groups, categories, wallets, tags, currencies] = await Promise.all([
      this.supabase.from('categories_group').select('*').eq('owner_id', userId),
      this.supabase.from('categories').select('*').eq('owner_id', userId),
      this.supabase.from('wallets').select('*').eq('owner_id', userId),
      this.supabase.from('tags').select('*').eq('owner_id', userId),
      this.supabase.from('currencies').select('*'),
    ]);

    for (const result of [groups, categories, wallets, tags, currencies]) {
      if (result.error) {
        throw result.error;
      }
    }

    return {
      groups: (groups.data ?? []) as CategoryGroupRow[],
      categories: (categories.data ?? []) as CategoryRow[],
      wallets: (wallets.data ?? []) as WalletRow[],
      tags: (tags.data ?? []) as TagRow[],
      currencies: (currencies.data ?? []) as CurrencyRow[],
    };
  }

  private mapExportRows(
    transactions: readonly TransactionRow[],
    tagRows: readonly TransactionTagRow[],
    lookups: TransferLookups,
  ): readonly SpendistCsvExportRow[] {
    const groupsById = new Map(lookups.groups.map((group) => [group.id, group]));
    const categoriesById = new Map(lookups.categories.map((category) => [category.id, category]));
    const walletsById = new Map(lookups.wallets.map((wallet) => [wallet.id, wallet]));
    const currenciesById = new Map(lookups.currencies.map((currency) => [currency.id, currency.symbol.toUpperCase()]));
    const tagsById = new Map(lookups.tags.map((tag) => [tag.id, tag]));
    const tagsByTransaction = new Map<string, string[]>();
    for (const tagRow of tagRows) {
      const tag = tagsById.get(tagRow.tag_id);
      if (!tag) {
        continue;
      }
      const existing = tagsByTransaction.get(tagRow.transaction_id) ?? [];
      existing.push(tag.name);
      tagsByTransaction.set(tagRow.transaction_id, existing);
    }

    return transactions.map((transaction) => {
      const category = categoriesById.get(transaction.category_id);
      const group = category ? groupsById.get(category.group_id) : null;
      const wallet = walletsById.get(transaction.wallet_id);
      const walletCurrency = wallet ? currenciesById.get(wallet.currency_id) ?? transaction.currency : transaction.currency;
      return {
        id: transaction.id,
        occurred_at: transaction.occurred_at,
        description: transaction.description ?? '',
        direction: transaction.direction,
        amount: transaction.amount,
        currency: transaction.currency,
        amount_in_default: transaction.amount_in_default,
        category_group: group?.name ?? '',
        category_path: category ? this.buildCategoryPath(category, categoriesById) : '',
        category: category?.name ?? '',
        wallet: wallet?.name ?? '',
        wallet_currency: walletCurrency,
        tags: [...(tagsByTransaction.get(transaction.id) ?? [])].sort((a, b) => a.localeCompare(b)),
        is_automatic: transaction.is_automatic,
        recurring_scheduled_for: transaction.recurring_scheduled_for ?? '',
        import_source: transaction.import_source ?? '',
        imported_at: transaction.imported_at ?? '',
      };
    });
  }

  private validateImportRows(
    rows: readonly SpendistCsvImportRow[],
    lookups: TransferLookups,
    currencySymbols: ReadonlySet<string>,
  ): {
    readonly issues: readonly SpendistCsvIssue[];
    readonly rejectedRowNumbers: ReadonlySet<number>;
    readonly newGroups: readonly string[];
    readonly newCategories: readonly string[];
    readonly newWallets: readonly string[];
    readonly newTags: readonly string[];
  } {
    const issues: SpendistCsvIssue[] = [];
    const rejectedRowNumbers = new Set<number>();
    const existingGroups = new Set(lookups.groups.map((group) => normalizeLookupKey(group.name)));
    const existingCategories = new Set(lookups.categories.map((category) => normalizeLookupKey(category.name)));
    const existingWallets = new Map(lookups.wallets.map((wallet) => [normalizeLookupKey(wallet.name), wallet]));
    const existingTags = new Set(lookups.tags.map((tag) => normalizeLookupKey(tag.name)));

    for (const row of rows) {
      if (!currencySymbols.has(row.currency)) {
        issues.push({ rowNumber: row.sourceRowNumber, message: `Unknown transaction currency: ${row.currency}.` });
        rejectedRowNumbers.add(row.sourceRowNumber);
      }

      const existingWallet = existingWallets.get(normalizeLookupKey(row.wallet));
      if (!existingWallet && !row.walletCurrency) {
        issues.push({
          rowNumber: row.sourceRowNumber,
          message: 'wallet_currency is required when the wallet does not exist.',
        });
        rejectedRowNumbers.add(row.sourceRowNumber);
      } else if (row.walletCurrency && !currencySymbols.has(row.walletCurrency)) {
        issues.push({ rowNumber: row.sourceRowNumber, message: `Unknown wallet currency: ${row.walletCurrency}.` });
        rejectedRowNumbers.add(row.sourceRowNumber);
      }
    }

    const validRows = rows.filter((row) => !rejectedRowNumbers.has(row.sourceRowNumber));
    return {
      issues,
      rejectedRowNumbers,
      newGroups: collectMissingNames(validRows.map((row) => row.categoryGroup), existingGroups),
      newCategories: collectMissingNames(validRows.flatMap((row) => row.categoryPath), existingCategories),
      newWallets: collectMissingNames(validRows.map((row) => row.wallet), new Set(existingWallets.keys())),
      newTags: collectMissingNames(validRows.flatMap((row) => row.tags), existingTags),
    };
  }

  private async ensureGroups(
    userId: string,
    rows: readonly SpendistCsvImportRow[],
  ): Promise<ReadonlyMap<string, CategoryGroupRow>> {
    const existing = await this.loadGroups(userId);
    const existingKeys = new Set(existing.map((group) => normalizeLookupKey(group.name)));
    const missing = collectMissingNames(rows.map((row) => row.categoryGroup), existingKeys);
    if (missing.length > 0) {
      const insertRows: CategoryGroupInsert[] = missing.map((name) => ({
        owner_id: userId,
        name,
        color: defaultColorForName(name),
        icon: null,
      }));
      const { error } = await this.supabase.from('categories_group').insert(insertRows);
      if (error && error.code !== '23505') {
        throw error;
      }
    }

    return new Map((await this.loadGroups(userId)).map((group) => [normalizeLookupKey(group.name), group]));
  }

  private async ensureCategories(
    userId: string,
    rows: readonly SpendistCsvImportRow[],
    groups: ReadonlyMap<string, CategoryGroupRow>,
  ): Promise<ReadonlyMap<string, CategoryRow>> {
    const categories = await this.loadCategories(userId);
    const byName = new Map(categories.map((category) => [normalizeLookupKey(category.name), category]));

    for (const row of rows) {
      const group = groups.get(normalizeLookupKey(row.categoryGroup));
      if (!group) {
        throw new Error(`Missing category group for ${row.categoryGroup}.`);
      }

      let parentId: string | null = null;
      for (const part of row.categoryPath) {
        const key = normalizeLookupKey(part);
        const existing = byName.get(key);
        if (existing) {
          parentId = existing.id;
          continue;
        }

        const insertRow: CategoryInsert = {
          owner_id: userId,
          name: part,
          group_id: group.id,
          parent_id: parentId,
          color: defaultColorForName(part),
          icon: null,
        };

        const { data, error } = await this.supabase.from('categories').insert(insertRow).select('*').single();
        if (error) {
          if (error.code !== '23505') {
            throw error;
          }
          const refreshed = await this.loadCategories(userId);
          refreshed.forEach((category) => byName.set(normalizeLookupKey(category.name), category));
          const conflicted = byName.get(key);
          if (!conflicted) {
            throw error;
          }
          parentId = conflicted.id;
          continue;
        }

        const created = data as CategoryRow;
        byName.set(key, created);
        parentId = created.id;
      }
    }

    return byName;
  }

  private async ensureWallets(
    userId: string,
    rows: readonly SpendistCsvImportRow[],
  ): Promise<ReadonlyMap<string, WalletRow>> {
    const [wallets, currencies] = await Promise.all([this.loadWallets(userId), this.loadCurrencies()]);
    const byName = new Map(wallets.map((wallet) => [normalizeLookupKey(wallet.name), wallet]));
    const currencyBySymbol = new Map(currencies.map((currency) => [currency.symbol.toUpperCase(), currency]));
    const insertRows: WalletInsert[] = [];

    for (const row of rows) {
      const key = normalizeLookupKey(row.wallet);
      if (byName.has(key)) {
        continue;
      }
      const currency = row.walletCurrency ? currencyBySymbol.get(row.walletCurrency) : null;
      if (!currency) {
        throw new Error(`Missing wallet currency for ${row.wallet}.`);
      }
      insertRows.push({
        owner_id: userId,
        name: row.wallet,
        currency_id: currency.id,
        is_default: false,
      });
      byName.set(key, {
        id: `pending:${key}`,
        owner_id: userId,
        name: row.wallet,
        currency_id: currency.id,
        is_default: false,
        creation_date: '',
        updated_at: '',
      });
    }

    if (insertRows.length > 0) {
      const { error } = await this.supabase.from('wallets').insert(insertRows);
      if (error && error.code !== '23505') {
        throw error;
      }
    }

    return new Map((await this.loadWallets(userId)).map((wallet) => [normalizeLookupKey(wallet.name), wallet]));
  }

  private async ensureTags(userId: string, rows: readonly SpendistCsvImportRow[]): Promise<ReadonlyMap<string, TagRow>> {
    const tags = await this.loadTags(userId);
    const existing = new Set(tags.map((tag) => normalizeLookupKey(tag.name)));
    const missing = collectMissingNames(rows.flatMap((row) => row.tags), existing);
    if (missing.length > 0) {
      const { error } = await this.supabase.from('tags').insert(
        missing.map((name) => ({
          owner_id: userId,
          name,
        })),
      );
      if (error && error.code !== '23505') {
        throw error;
      }
    }

    return new Map((await this.loadTags(userId)).map((tag) => [normalizeLookupKey(tag.name), tag]));
  }

  private async insertTransactions(
    userId: string,
    rows: readonly SpendistCsvImportRow[],
    categories: ReadonlyMap<string, CategoryRow>,
    wallets: ReadonlyMap<string, WalletRow>,
  ): Promise<readonly Pick<TransactionTagRow, 'transaction_id'>[]> {
    const now = new Date().toISOString();
    const transactionRows: TransactionInsert[] = rows.map((row) => {
      const category = categories.get(normalizeLookupKey(row.categoryPath[row.categoryPath.length - 1] ?? ''));
      const wallet = wallets.get(normalizeLookupKey(row.wallet));
      if (!category || !wallet) {
        throw new Error(`Missing category or wallet for row ${row.sourceRowNumber}.`);
      }

      return {
        owner_id: userId,
        category_id: category.id,
        wallet_id: wallet.id,
        occurred_at: row.occurredAt.toISOString(),
        description: row.description,
        amount: row.amount,
        amount_in_default: row.amountInDefault,
        currency: row.currency,
        direction: row.direction,
        exchange_rate: null,
        is_automatic: row.isAutomatic,
        recurring_scheduled_for: row.isAutomatic ? row.recurringScheduledFor?.toISOString() ?? null : null,
        import_source: SPENDIST_CSV_IMPORT_SOURCE,
        import_fingerprint: row.fingerprint,
        import_metadata: {
          source: SPENDIST_CSV_IMPORT_SOURCE,
          source_row_number: row.sourceRowNumber,
          source_id: row.sourceId,
          source_import_source: row.sourceImportSource,
          source_imported_at: row.sourceImportedAt,
          category_path: row.categoryPath,
          tags: row.tags,
        } as unknown as Json,
        imported_at: now,
      };
    });

    const { data, error } = await this.supabase.from('transactions').insert(transactionRows).select('id');
    if (error) {
      throw error;
    }

    return (data ?? []).map((transaction) => ({ transaction_id: transaction.id }));
  }

  private async insertTransactionTags(
    userId: string,
    rows: readonly SpendistCsvImportRow[],
    inserted: readonly Pick<TransactionTagRow, 'transaction_id'>[],
    tags: ReadonlyMap<string, TagRow>,
  ): Promise<void> {
    const tagRows = rows.flatMap((row, index) => {
      const transactionId = inserted[index]?.transaction_id;
      if (!transactionId) {
        return [];
      }

      return row.tags
        .map((tagName) => tags.get(normalizeLookupKey(tagName)))
        .filter((tag): tag is TagRow => !!tag)
        .map((tag) => ({
          owner_id: userId,
          transaction_id: transactionId,
          tag_id: tag.id,
        }));
    });

    if (tagRows.length === 0) {
      return;
    }

    const { error } = await this.supabase.from('transaction_tags').insert(tagRows);
    if (error) {
      throw error;
    }
  }

  private async loadExistingFingerprints(rows: readonly SpendistCsvImportRow[]): Promise<Set<string>> {
    const result = new Set<string>();
    const fingerprints = Array.from(new Set(rows.map((row) => row.fingerprint)));
    if (fingerprints.length === 0) {
      return result;
    }

    for (const batch of chunk(fingerprints, IN_FILTER_BATCH_SIZE)) {
      const { data, error } = await this.supabase.rpc('find_existing_transaction_import_fingerprints', {
        p_import_source: SPENDIST_CSV_IMPORT_SOURCE,
        p_import_fingerprints: batch,
      });
      if (error) {
        throw error;
      }
      for (const row of data ?? []) {
        if (row.import_fingerprint) {
          result.add(row.import_fingerprint);
        }
      }
    }

    return result;
  }

  private async loadTransactionTagRows(userId: string, transactionIds: readonly string[]): Promise<readonly TransactionTagRow[]> {
    const rows: TransactionTagRow[] = [];
    for (const batch of chunk(transactionIds, IN_FILTER_BATCH_SIZE)) {
      if (batch.length === 0) {
        continue;
      }
      const { data, error } = await this.supabase
        .from('transaction_tags')
        .select('*')
        .eq('owner_id', userId)
        .in('transaction_id', batch);
      if (error) {
        throw error;
      }
      rows.push(...((data ?? []) as TransactionTagRow[]));
    }
    return rows;
  }

  private async loadGroups(userId: string): Promise<readonly CategoryGroupRow[]> {
    const { data, error } = await this.supabase.from('categories_group').select('*').eq('owner_id', userId);
    if (error) {
      throw error;
    }
    return (data ?? []) as CategoryGroupRow[];
  }

  private async loadCategories(userId: string): Promise<readonly CategoryRow[]> {
    const { data, error } = await this.supabase.from('categories').select('*').eq('owner_id', userId);
    if (error) {
      throw error;
    }
    return (data ?? []) as CategoryRow[];
  }

  private async loadWallets(userId: string): Promise<readonly WalletRow[]> {
    const { data, error } = await this.supabase.from('wallets').select('*').eq('owner_id', userId);
    if (error) {
      throw error;
    }
    return (data ?? []) as WalletRow[];
  }

  private async loadTags(userId: string): Promise<readonly TagRow[]> {
    const { data, error } = await this.supabase.from('tags').select('*').eq('owner_id', userId);
    if (error) {
      throw error;
    }
    return (data ?? []) as TagRow[];
  }

  private async loadCurrencies(): Promise<readonly CurrencyRow[]> {
    const { data, error } = await this.supabase.from('currencies').select('*');
    if (error) {
      throw error;
    }
    return (data ?? []) as CurrencyRow[];
  }

  private expandCategoryIds(categoryIds: readonly string[], categories: readonly CategoryRow[]): readonly string[] {
    const children = new Map<string, string[]>();
    for (const category of categories) {
      if (!category.parent_id) {
        continue;
      }
      children.set(category.parent_id, [...(children.get(category.parent_id) ?? []), category.id]);
    }

    const result = new Set<string>();
    const visit = (categoryId: string): void => {
      if (result.has(categoryId)) {
        return;
      }
      result.add(categoryId);
      for (const childId of children.get(categoryId) ?? []) {
        visit(childId);
      }
    };
    categoryIds.forEach(visit);
    return Array.from(result);
  }

  private buildCategoryPath(category: CategoryRow, categoriesById: ReadonlyMap<string, CategoryRow>): string {
    const parts: string[] = [];
    let current: CategoryRow | undefined = category;
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      parts.unshift(current.name);
      current = current.parent_id ? categoriesById.get(current.parent_id) : undefined;
    }
    return parts.join('/');
  }

  private requireUserId(message: string): string {
    const userId = this.auth.session()?.user.id;
    if (!userId) {
      throw new Error(message);
    }
    return userId;
  }

  private setError(error: string): void {
    this.state.update((state) => ({
      ...state,
      error,
    }));
  }
}

function monthRange(month: string): { from: string; to: string } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }
  const from = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
  return { from: from.toISOString(), to: to.toISOString() };
}

function buildExportFileName(month: string | null, filtered: boolean): string {
  const scope = month ?? 'all';
  return `spendist-transactions-${scope}${filtered ? '-filtered' : ''}.csv`;
}

function collectMissingNames(values: readonly string[], existingValues: ReadonlySet<string>): readonly string[] {
  const missing = new Map<string, string>();
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) {
      continue;
    }
    const key = normalizeLookupKey(normalized);
    if (!existingValues.has(key) && !missing.has(key)) {
      missing.set(key, normalized);
    }
  }
  return Array.from(missing.values()).sort((a, b) => a.localeCompare(b));
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function defaultColorForName(name: string): string {
  const colors = ['#0EA5A5', '#F59E0B', '#EA580C', '#16A34A', '#D97706'];
  let hash = 0;
  for (const character of name) {
    hash = (hash + character.charCodeAt(0)) % colors.length;
  }
  return colors[hash];
}

function chunk<T>(items: readonly T[], size: number): readonly T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function describeTransferError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.startsWith('settings.')) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}

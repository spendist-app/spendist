import { computed, inject, Injectable, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import type {
  CategoryGroupRow,
  CategoryRow,
  Json,
  TagRow,
  TransactionInsert,
  TransactionTagRow,
} from '@spendist/data-access/supabase-types';

import { AuthService } from '../../core/auth.service';
import { SUPABASE_CLIENT } from '../../core/supabase';
import { SettingsStore } from './settings.store';
import {
  KONTOMIERZ_FALLBACK_CATEGORY,
  KONTOMIERZ_IMPORT_SOURCE,
  KONTOMIERZ_SHEET_NAME,
  KontomierzImportRow,
  KontomierzParseIssue,
  KontomierzParseResult,
  KontomierzWorksheet,
  parseKontomierzWorksheet,
} from './kontomierz-import.parser';

export interface KontomierzImportSummary {
  readonly fileName: string;
  readonly totalDataRows: number;
  readonly parsedTransactions: number;
  readonly skippedSplitParents: number;
  readonly duplicates: number;
  readonly importableTransactions: number;
  readonly newGroups: readonly string[];
  readonly newCategories: readonly string[];
  readonly newTags: readonly string[];
  readonly issues: readonly KontomierzParseIssue[];
}

interface KontomierzPreparedImport {
  readonly fileName: string;
  readonly walletId: string;
  readonly rows: readonly KontomierzImportRow[];
  readonly importableRows: readonly KontomierzImportRow[];
  readonly duplicateFingerprints: ReadonlySet<string>;
  readonly newGroups: readonly string[];
  readonly newCategories: readonly string[];
  readonly newTags: readonly string[];
  readonly parseResult: KontomierzParseResult;
}

interface KontomierzImportState {
  readonly analyzing: boolean;
  readonly importing: boolean;
  readonly progress: number;
  readonly imported: number;
  readonly duplicatesSkipped: number;
  readonly error: string | null;
  readonly summary: KontomierzImportSummary | null;
  readonly prepared: KontomierzPreparedImport | null;
}

const IMPORT_BATCH_SIZE = 500;

@Injectable()
export class KontomierzImportStore {
  private readonly supabase = inject<SupabaseClient>(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);
  private readonly settingsStore = inject(SettingsStore);

  private readonly state = signal<KontomierzImportState>({
    analyzing: false,
    importing: false,
    progress: 0,
    imported: 0,
    duplicatesSkipped: 0,
    error: null,
    summary: null,
    prepared: null,
  });

  readonly analyzing = computed(() => this.state().analyzing);
  readonly importing = computed(() => this.state().importing);
  readonly progress = computed(() => this.state().progress);
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
      analyzing: false,
      importing: false,
      progress: 0,
      imported: 0,
      duplicatesSkipped: 0,
      error: null,
      summary: null,
      prepared: null,
    });
  }

  async analyzeFile(file: File, walletId: string): Promise<void> {
    const userId = this.requireUserId();
    if (!walletId) {
      this.setError('settings.panels.kontomierzImport.errors.walletRequired');
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
      const worksheet = await this.readWorkbook(file);
      const parseResult = parseKontomierzWorksheet(worksheet);
      const rows = parseResult.rows;
      const duplicateFingerprints = rows.length > 0 ? await this.loadExistingFingerprints(rows) : new Set<string>();
      const importableRows = rows.filter((row) => !duplicateFingerprints.has(row.fingerprint));
      const [existingGroups, existingCategories, existingTags] = await Promise.all([
        this.loadGroups(userId),
        this.loadCategories(userId),
        this.loadTags(userId),
      ]);
      const newGroups = collectMissingNames(
        rows.map((row) => row.groupName),
        existingGroups.map((group) => group.name),
      );
      const newCategories = collectMissingNames(
        rows.map((row) => row.categoryName),
        existingCategories.map((category) => category.name),
      );
      const newTags = collectMissingNames(
        rows.flatMap((row) => row.tagNames),
        existingTags.map((tag) => tag.name),
      );
      const summary: KontomierzImportSummary = {
        fileName: file.name,
        totalDataRows: parseResult.totalDataRows,
        parsedTransactions: rows.length,
        skippedSplitParents: parseResult.skippedSplitParents,
        duplicates: duplicateFingerprints.size,
        importableTransactions: importableRows.length,
        newGroups,
        newCategories,
        newTags,
        issues: parseResult.issues,
      };

      this.state.update((state) => ({
        ...state,
        analyzing: false,
        error: null,
        summary,
        prepared: {
          fileName: file.name,
          walletId,
          rows,
          importableRows,
          duplicateFingerprints,
          newGroups,
          newCategories,
          newTags,
          parseResult,
        },
      }));
    } catch (error) {
      this.state.update((state) => ({
        ...state,
        analyzing: false,
        error: describeImportError(error),
      }));
    }
  }

  async importPrepared(): Promise<void> {
    const userId = this.requireUserId();
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
      const tags = await this.ensureTags(userId, prepared.rows);

      let imported = 0;
      let duplicatesSkipped = 0;
      for (let index = 0; index < prepared.importableRows.length; index += IMPORT_BATCH_SIZE) {
        const batch = prepared.importableRows.slice(index, index + IMPORT_BATCH_SIZE);
        const freshDuplicates = await this.loadExistingFingerprints(batch);
        const rowsToInsert = batch.filter((row) => !freshDuplicates.has(row.fingerprint));
        duplicatesSkipped += freshDuplicates.size;

        if (rowsToInsert.length > 0) {
          const inserted = await this.insertTransactions(userId, prepared.walletId, rowsToInsert, categories);
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
        error: describeImportError(error),
      }));
    }
  }

  private async readWorkbook(file: File): Promise<KontomierzWorksheet> {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      throw new Error('settings.panels.kontomierzImport.errors.unsupportedFile');
    }

    const [{ read, utils }, buffer] = await Promise.all([import('xlsx/xlsx.mjs'), file.arrayBuffer()]);
    const workbook = read(buffer, { type: 'array', cellDates: false });
    const sheetName = workbook.SheetNames.find((name) => name === KONTOMIERZ_SHEET_NAME) ?? workbook.SheetNames[0];
    const sheet = sheetName ? workbook.Sheets[sheetName] : null;
    if (!sheetName || !sheet) {
      throw new Error('settings.panels.kontomierzImport.errors.emptyWorkbook');
    }

    return {
      name: sheetName,
      rows: utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, raw: true }),
    };
  }

  private async ensureGroups(userId: string, rows: readonly KontomierzImportRow[]): Promise<ReadonlyMap<string, CategoryGroupRow>> {
    await this.createMissingGroups(userId, rows);
    const groups = await this.loadGroups(userId);
    return new Map(groups.map((group) => [normalizeLookupKey(group.name), group]));
  }

  private async createMissingGroups(userId: string, rows: readonly KontomierzImportRow[]): Promise<void> {
    const existing = new Set((await this.loadGroups(userId)).map((group) => normalizeLookupKey(group.name)));
    const missing = collectMissingNames(
      rows.map((row) => row.groupName),
      Array.from(existing),
    );
    if (missing.length === 0) {
      return;
    }

    const { error } = await this.supabase.from('categories_group').insert(
      missing.map((name) => ({
        owner_id: userId,
        name,
        color: defaultColorForName(name),
        icon: null,
      })),
    );
    if (error && error.code !== '23505') {
      throw error;
    }
  }

  private async ensureCategories(
    userId: string,
    rows: readonly KontomierzImportRow[],
    groups: ReadonlyMap<string, CategoryGroupRow>,
  ): Promise<ReadonlyMap<string, CategoryRow>> {
    await this.createMissingCategories(userId, rows, groups);
    const categories = await this.loadCategories(userId);
    return new Map(categories.map((category) => [normalizeLookupKey(category.name), category]));
  }

  private async createMissingCategories(
    userId: string,
    rows: readonly KontomierzImportRow[],
    groups: ReadonlyMap<string, CategoryGroupRow>,
  ): Promise<void> {
    const existing = new Set((await this.loadCategories(userId)).map((category) => normalizeLookupKey(category.name)));
    const byName = new Map<string, KontomierzImportRow>();
    for (const row of rows) {
      const key = normalizeLookupKey(row.categoryName);
      if (!existing.has(key) && !byName.has(key)) {
        byName.set(key, row);
      }
    }

    const missing = Array.from(byName.values());
    if (missing.length === 0) {
      return;
    }

    const fallbackGroup = groups.get(normalizeLookupKey(KONTOMIERZ_FALLBACK_CATEGORY)) ?? groups.values().next().value;
    if (!fallbackGroup) {
      throw new Error('No category group is available for imported categories.');
    }

    const { error } = await this.supabase.from('categories').insert(
      missing.map((row) => ({
        owner_id: userId,
        name: row.categoryName,
        group_id: groups.get(normalizeLookupKey(row.groupName))?.id ?? fallbackGroup.id,
        parent_id: null,
        color: defaultColorForName(row.groupName),
        icon: null,
      })),
    );
    if (error && error.code !== '23505') {
      throw error;
    }
  }

  private async ensureTags(userId: string, rows: readonly KontomierzImportRow[]): Promise<ReadonlyMap<string, TagRow>> {
    await this.createMissingTags(userId, rows);
    const tags = await this.loadTags(userId);
    return new Map(tags.map((tag) => [normalizeLookupKey(tag.name), tag]));
  }

  private async createMissingTags(userId: string, rows: readonly KontomierzImportRow[]): Promise<void> {
    const existing = new Set((await this.loadTags(userId)).map((tag) => normalizeLookupKey(tag.name)));
    const missing = collectMissingNames(
      rows.flatMap((row) => row.tagNames),
      Array.from(existing),
    );
    if (missing.length === 0) {
      return;
    }

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

  private async insertTransactions(
    userId: string,
    walletId: string,
    rows: readonly KontomierzImportRow[],
    categories: ReadonlyMap<string, CategoryRow>,
  ): Promise<readonly Pick<TransactionTagRow, 'transaction_id'>[]> {
    const now = new Date().toISOString();
    const transactionRows: TransactionInsert[] = rows.map((row) => {
      const category = categories.get(normalizeLookupKey(row.categoryName));
      if (!category) {
        throw new Error(`Missing Spendist category for ${row.categoryName}.`);
      }

      return {
        owner_id: userId,
        category_id: category.id,
        wallet_id: walletId,
        occurred_at: row.occurredAt.toISOString(),
        description: row.description,
        amount: row.amount,
        amount_in_default: row.amountInDefault,
        currency: row.currency,
        direction: row.direction,
        exchange_rate: null,
        is_automatic: false,
        import_source: KONTOMIERZ_IMPORT_SOURCE,
        import_fingerprint: row.fingerprint,
        import_metadata: row.metadata as unknown as Json,
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
    rows: readonly KontomierzImportRow[],
    inserted: readonly Pick<TransactionTagRow, 'transaction_id'>[],
    tags: ReadonlyMap<string, TagRow>,
  ): Promise<void> {
    const tagRows = rows.flatMap((row, index) => {
      const transactionId = inserted[index]?.transaction_id;
      if (!transactionId) {
        return [];
      }

      return row.tagNames
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

  private async loadExistingFingerprints(rows: readonly KontomierzImportRow[]): Promise<Set<string>> {
    const result = new Set<string>();
    const fingerprints = Array.from(new Set(rows.map((row) => row.fingerprint)));
    if (fingerprints.length === 0) {
      return result;
    }

    const { data, error } = await this.supabase.rpc('find_existing_transaction_import_fingerprints', {
      p_import_source: KONTOMIERZ_IMPORT_SOURCE,
      p_import_fingerprints: fingerprints,
    });
    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      if (row.import_fingerprint) {
        result.add(row.import_fingerprint);
      }
    }

    return result;
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

  private async loadTags(userId: string): Promise<readonly TagRow[]> {
    const { data, error } = await this.supabase.from('tags').select('*').eq('owner_id', userId);
    if (error) {
      throw error;
    }
    return (data ?? []) as TagRow[];
  }

  private requireUserId(): string {
    const userId = this.auth.session()?.user.id;
    if (!userId) {
      throw new Error('settings.panels.kontomierzImport.errors.authRequired');
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

function collectMissingNames(values: readonly string[], existingValues: readonly string[]): readonly string[] {
  const existing = new Set(existingValues.map((value) => normalizeLookupKey(value)));
  const missing = new Map<string, string>();

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) {
      continue;
    }

    const key = normalizeLookupKey(normalized);
    if (!existing.has(key) && !missing.has(key)) {
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

function describeImportError(error: unknown): string {
  if (error instanceof Error && error.message.startsWith('settings.')) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return 'settings.panels.kontomierzImport.errors.generic';
}

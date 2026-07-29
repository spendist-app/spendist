import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  PostgrestError,
  PostgrestResponse,
  PostgrestSingleResponse,
  SupabaseClient,
} from '@supabase/supabase-js';
import { AuthService } from '../../../core/auth.service';
import { logError } from '../../../core/logger';
import { SUPABASE_CLIENT } from '../../../core/supabase';
import {
  calculateRecurringMonthlyPlan,
  type RecurringMonthlyPlan,
} from './recurring-monthly-plan';
import type {
  CategoryGroupRow,
  CategoryRow,
  RecurringTransactionRow,
  RecurringTransactionsOverviewRow,
  TagRow,
  TransactionDirection,
  WalletRow,
  Tables,
} from '@spendist/data-access/supabase-types';

export type RecurringTransactionDirection = TransactionDirection;
export type RecurringAmountMode = 'fixed' | 'variable';
export type RecurringPaymentsFilter = 'active' | 'stopped' | 'all';

export interface RecurringCategorySummary {
  readonly id: string;
  readonly name: string;
  readonly color: string | null;
  readonly icon: string | null;
  readonly groupId: string | null;
  readonly parentId: string | null;
}

export interface RecurringCategoryGroupSummary {
  readonly id: string;
  readonly name: string;
  readonly color: string | null;
  readonly icon: string | null;
}

export interface RecurringTagSummary {
  readonly id: string;
  readonly name: string;
  readonly color: string | null;
  readonly icon: string | null;
}

export interface RecurringTransactionEntity {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly categoryId: string;
  readonly startDate: Date;
  readonly endDate: Date | null;
  readonly schedule: string;
  readonly amount: number;
  readonly amountMode: RecurringAmountMode;
  readonly currency: string;
  readonly exchangeRate: number | null;
  readonly direction: RecurringTransactionDirection;
  readonly category: RecurringCategorySummary | null;
  readonly tags: readonly RecurringTagSummary[];
  readonly walletId: string;
  readonly walletName: string | null;
  readonly isPaused: boolean;
  readonly pausedAt: Date | null;
  readonly sourceModule: 'standard' | 'allowance';
  readonly allowanceConnectionId: string | null;
}

export interface RecurringOccurrenceEntity {
  readonly id: string;
  readonly recurringTransactionId: string;
  readonly recurringName: string;
  readonly scheduledFor: Date;
  readonly amount: number | null;
  readonly currency: string;
  readonly transactionId: string | null;
}

export interface CurrencyOption {
  readonly id: number;
  readonly symbol: string;
}

type CurrencyRow = Tables<'currencies'>;

export interface RecurringPaymentsStats {
  readonly monthlyExpense: number;
  readonly yearlyExpense: number;
}

interface RecurringPaymentsState {
  readonly loading: boolean;
  readonly error: string | null;
  readonly mutationPending: boolean;
  readonly mutationError: string | null;
  readonly stats: RecurringPaymentsStats;
  readonly recurringTransactions: readonly RecurringTransactionEntity[];
  readonly pendingOccurrences: readonly RecurringOccurrenceEntity[];
  readonly categories: readonly RecurringCategorySummary[];
  readonly groups: readonly RecurringCategoryGroupSummary[];
  readonly tags: readonly RecurringTagSummary[];
  readonly currencies: readonly CurrencyOption[];
  readonly defaultCurrency: string;
  readonly wallets: readonly WalletEntity[];
}

export interface WalletEntity {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly isDefault: boolean;
  readonly currencyId: number;
  readonly currency: string;
}

type RecurringOverviewRow = Readonly<
  Omit<
    RecurringTransactionsOverviewRow,
    'monthly_expense' | 'yearly_expense' | 'recurring_transactions'
  > & {
    monthly_expense: number | string | null;
    yearly_expense: number | string | null;
  }
>;

type RecurringTransactionTagRow = Tables<'recurring_transaction_tags'>;
type RecurringOccurrenceRow = Tables<'recurring_transaction_occurrences'>;

export interface CreateRecurringTransactionPayload {
  readonly name: string;
  readonly categoryId: string;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly schedule: string;
  readonly amount: number;
  readonly currency: string;
  readonly amountMode: RecurringAmountMode;
  readonly direction: RecurringTransactionDirection;
  readonly tagIds: readonly string[];
  readonly walletId: string | null;
}

export type UpdateRecurringTransactionPayload =
  CreateRecurringTransactionPayload;

class RecurringPaymentsStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecurringPaymentsStoreError';
  }
}

const DEFAULT_CURRENCY = 'PLN';

function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

@Injectable()
export class RecurringPaymentsStore {
  private readonly supabase = inject<SupabaseClient>(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);

  private readonly userId = signal<string | null>(null);
  private readonly state = signal<RecurringPaymentsState>({
    loading: true,
    error: null,
    mutationPending: false,
    mutationError: null,
    stats: {
      monthlyExpense: 0,
      yearlyExpense: 0,
    },
    recurringTransactions: [],
    pendingOccurrences: [],
    categories: [],
    groups: [],
    tags: [],
    currencies: [],
    defaultCurrency: DEFAULT_CURRENCY,
    wallets: [],
  });
  private readonly editingId = signal<string | null>(null);
  private readonly listFilter = signal<RecurringPaymentsFilter>('active');

  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly mutationPending = computed(() => this.state().mutationPending);
  readonly mutationError = computed(() => this.state().mutationError);
  readonly stats = computed(() => this.state().stats);
  readonly monthlyPlan = computed<RecurringMonthlyPlan>(() => {
    const state = this.state();
    return calculateRecurringMonthlyPlan(
      state.recurringTransactions,
      state.stats.monthlyExpense,
      state.defaultCurrency,
      new Date()
    );
  });
  readonly recurringTransactions = computed(
    () => this.state().recurringTransactions
  );
  readonly recurringPaymentsFilter = computed(() => this.listFilter());
  readonly filteredRecurringTransactions = computed(() => {
    const filter = this.listFilter();
    const now = new Date();

    return this.state().recurringTransactions.filter((transaction) => {
      if (filter === 'all') {
        return true;
      }

      if (filter === 'stopped') {
        return transaction.isPaused;
      }

      return !transaction.isPaused && !this.isNaturallyEnded(transaction, now);
    });
  });
  readonly pendingOccurrences = computed(() => this.state().pendingOccurrences);
  readonly categories = computed(() => this.state().categories);
  readonly groups = computed(() => this.state().groups);
  readonly groupedCategories = computed(() =>
    this.state()
      .groups.map((group) => ({
        ...group,
        categories: this.state().categories.filter(
          (category) => category.groupId === group.id
        ),
      }))
      .filter((group) => group.categories.length > 0)
  );
  readonly ungroupedCategories = computed(() =>
    this.state().categories.filter((category) => !category.groupId)
  );
  readonly tags = computed(() => this.state().tags);
  readonly currencies = computed(() => this.state().currencies);
  readonly defaultCurrency = computed(() => this.state().defaultCurrency);
  readonly wallets = computed(() => this.state().wallets);
  readonly defaultWalletId = computed(() => {
    const wallets = this.state().wallets;
    const preferred = wallets.find((wallet) => wallet.isDefault);
    return preferred?.id ?? wallets[0]?.id ?? null;
  });
  readonly empty = computed(
    () => this.state().recurringTransactions.length === 0
  );
  readonly filteredEmpty = computed(
    () => this.filteredRecurringTransactions().length === 0
  );
  readonly editingRecurring = computed<RecurringTransactionEntity | null>(
    () => {
      const id = this.editingId();
      if (!id) {
        return null;
      }
      return (
        this.state().recurringTransactions.find(
          (transaction) => transaction.id === id
        ) ?? null
      );
    }
  );
  readonly isEditing = computed(() => this.editingId() !== null);

  constructor() {
    effect(() => {
      if (this.auth.loading()) {
        return;
      }

      const session = this.auth.session();
      if (!session) {
        this.userId.set(null);
        this.state.set({
          loading: false,
          error: null,
          mutationPending: false,
          mutationError: null,
          stats: {
            monthlyExpense: 0,
            yearlyExpense: 0,
          },
          recurringTransactions: [],
          pendingOccurrences: [],
          categories: [],
          groups: [],
          tags: [],
          currencies: [],
          defaultCurrency: DEFAULT_CURRENCY,
          wallets: [],
        });
        return;
      }

      const currentUserId = session.user.id;
      const previousUserId = this.userId();

      if (previousUserId !== currentUserId) {
        this.userId.set(currentUserId);
        void this.refresh();
        return;
      }

      if (!this.state().loading) {
        return;
      }
    });

    effect(() => {
      const editingId = this.editingId();
      const currentState = this.state();

      if (!editingId || currentState.loading) {
        return;
      }

      const exists = currentState.recurringTransactions.some(
        (transaction) => transaction.id === editingId
      );
      if (!exists) {
        this.editingId.set(null);
      }
    });
  }

  async refresh(): Promise<void> {
    const userId = this.userId();
    if (!userId) {
      this.state.set({
        loading: false,
        error: null,
        mutationPending: false,
        mutationError: null,
        stats: {
          monthlyExpense: 0,
          yearlyExpense: 0,
        },
        recurringTransactions: [],
        pendingOccurrences: [],
        categories: [],
        groups: [],
        tags: [],
        currencies: [],
        defaultCurrency: DEFAULT_CURRENCY,
        wallets: [],
      });
      return;
    }

    this.state.update((state) => ({
      ...state,
      loading: true,
      error: null,
    }));

    try {
      const [
        overviewResult,
        transactionsResult,
        occurrencesResult,
        groupsResult,
        categoriesResult,
        tagsResult,
        recurringTagsResult,
        walletsResult,
        currenciesResult,
      ] = await Promise.all([
        this.supabase
          .from('recurring_transactions_overview')
          .select('*')
          .eq('owner_id', userId)
          .maybeSingle(),
        this.supabase
          .from('recurring_transactions')
          .select('*')
          .eq('owner_id', userId)
          .order('start_date', { ascending: true })
          .order('name', { ascending: true }),
        this.supabase
          .from('recurring_transaction_occurrences')
          .select('*')
          .eq('owner_id', userId)
          .is('transaction_id', null)
          .order('scheduled_for', { ascending: true }),
        this.supabase
          .from('categories_group')
          .select('*')
          .eq('owner_id', userId)
          .order('name', { ascending: true }),
        this.supabase
          .from('categories')
          .select('*')
          .eq('owner_id', userId)
          .order('name', { ascending: true }),
        this.supabase
          .from('tags')
          .select('*')
          .eq('owner_id', userId)
          .order('name', { ascending: true }),
        this.supabase
          .from('recurring_transaction_tags')
          .select('*')
          .eq('owner_id', userId),
        this.supabase
          .from('wallets')
          .select('*')
          .eq('owner_id', userId)
          .order('is_default', { ascending: false })
          .order('name', { ascending: true }),
        this.supabase
          .from('currencies')
          .select('*')
          .order('symbol', { ascending: true }),
      ]);

      const overviewRow =
        this.ensureNoErrorMaybeSingle<RecurringOverviewRow>(overviewResult);
      const transactionRows =
        this.ensureNoErrorArray<RecurringTransactionRow>(transactionsResult);
      const occurrenceRows =
        this.ensureNoErrorArray<RecurringOccurrenceRow>(occurrencesResult);
      const groups = this.ensureNoErrorArray<CategoryGroupRow>(
        groupsResult
      ).map((group) => this.mapGroupRow(group));
      const categories = this.ensureNoErrorArray<CategoryRow>(
        categoriesResult
      ).map((category) => this.mapCategoryRow(category));
      const tags = this.ensureNoErrorArray<TagRow>(tagsResult).map((tag) =>
        this.mapTagRow(tag)
      );
      const recurringTagRows =
        this.ensureNoErrorArray<RecurringTransactionTagRow>(
          recurringTagsResult
        );
      const currencyRows = this.ensureNoErrorArray<CurrencyRow>(
        currenciesResult
      ).map((row) => this.mapCurrencyRow(row));
      const currencies = this.sortCurrencies(currencyRows);
      const currencyLookup = new Map(
        currencyRows.map((currency) => [currency.id, currency.symbol])
      );
      const walletRows = this.ensureNoErrorArray<WalletRow>(walletsResult);
      const wallets = this.sortWallets(
        walletRows.map((wallet) => this.mapWalletRow(wallet, currencyLookup))
      );
      const walletLookup = new Map(
        wallets.map((wallet) => [wallet.id, wallet])
      );
      const categoryLookup = new Map(
        categories.map((category) => [category.id, category])
      );
      const tagLookup = new Map(tags.map((tag) => [tag.id, tag]));
      const recurringTags = this.buildRecurringTagMap(
        recurringTagRows,
        tagLookup
      );
      const transactions = transactionRows.map((row) =>
        this.mapTransactionRow(row, walletLookup, categoryLookup, recurringTags)
      );
      const transactionLookup = new Map(
        transactions.map((transaction) => [transaction.id, transaction])
      );
      const pendingOccurrences = occurrenceRows.map((row) =>
        this.mapOccurrenceRow(row, transactionLookup)
      );
      const defaultWallet =
        wallets.find((wallet) => wallet.isDefault) ?? wallets[0] ?? null;

      const stats = this.mapOverviewStats(overviewRow);
      const defaultCurrency = defaultWallet?.currency ?? DEFAULT_CURRENCY;

      this.state.set({
        loading: false,
        error: null,
        mutationPending: false,
        mutationError: null,
        stats,
        recurringTransactions: transactions,
        pendingOccurrences,
        categories,
        groups,
        tags,
        currencies,
        defaultCurrency,
        wallets,
      });
    } catch (error) {
      const message = this.describeError(error);
      logError('RecurringPaymentsStore', 'Failed to refresh data:', error);
      this.state.update((state) => ({
        ...state,
        loading: false,
        error: message,
      }));
      throw new RecurringPaymentsStoreError(message);
    }
  }

  startEditing(recurringId: string): void {
    const transaction = this.state().recurringTransactions.find(
      (item) => item.id === recurringId
    );
    if (!transaction) {
      return;
    }

    this.editingId.set(recurringId);
    this.state.update((state) => ({
      ...state,
      mutationError: null,
    }));
  }

  cancelEditing(): void {
    if (!this.editingId()) {
      return;
    }

    this.editingId.set(null);
    this.state.update((state) => ({
      ...state,
      mutationError: null,
    }));
  }

  setRecurringPaymentsFilter(filter: RecurringPaymentsFilter): void {
    this.listFilter.set(filter);
  }

  async ensureTags(
    names: readonly string[]
  ): Promise<readonly RecurringTagSummary[]> {
    const userId = this.requireUserId();
    const sanitized = Array.from(
      new Set(
        names
          .map((name) => name.trim().replace(/\s+/g, ' ').slice(0, 60))
          .filter(Boolean)
      )
    );
    const existingByName = new Map(
      this.state().tags.map((tag) => [tag.name.toLowerCase(), tag])
    );
    const missing = sanitized.filter(
      (name) => !existingByName.has(name.toLowerCase())
    );

    if (missing.length > 0) {
      const { data, error } = await this.supabase
        .from('tags')
        .insert(missing.map((name) => ({ owner_id: userId, name })))
        .select('*');
      if (error) {
        throw error;
      }

      const created = (data ?? []).map((row) => this.mapTagRow(row as TagRow));
      this.state.update((state) => ({
        ...state,
        tags: [...state.tags, ...created].sort((left, right) =>
          left.name.localeCompare(right.name)
        ),
      }));
    }

    const tagsByName = new Map(
      this.state().tags.map((tag) => [tag.name.toLowerCase(), tag])
    );
    return sanitized
      .map((name) => tagsByName.get(name.toLowerCase()))
      .filter((tag): tag is RecurringTagSummary => Boolean(tag));
  }

  async createRecurringTransaction(
    payload: CreateRecurringTransactionPayload
  ): Promise<void> {
    const userId = this.requireUserId();
    this.state.update((state) => ({
      ...state,
      mutationPending: true,
      mutationError: null,
    }));

    const trimmedSchedule = payload.schedule.trim();
    const trimmedName = payload.name.trim();
    const wallet = this.resolveWallet(payload.walletId);
    if (!wallet) {
      throw new RecurringPaymentsStoreError(
        'modules.recurringPayments.form.fields.wallet.error'
      );
    }
    const currency =
      this.normalizeCurrency(payload.currency) ?? wallet.currency;

    try {
      const insertResult = await this.supabase
        .from('recurring_transactions')
        .insert({
          owner_id: userId,
          category_id: payload.categoryId,
          name: trimmedName,
          start_date: payload.startDate,
          end_date: payload.endDate,
          schedule: trimmedSchedule,
          amount: payload.amountMode === 'variable' ? 0 : payload.amount,
          amount_mode: payload.amountMode,
          currency,
          exchange_rate: null,
          direction: payload.direction,
          wallet_id: wallet.id,
        })
        .select('id')
        .single();

      const inserted =
        this.ensureNoErrorSingle<Pick<RecurringTransactionRow, 'id'>>(
          insertResult
        );

      if (payload.tagIds.length > 0) {
        const tagRows = payload.tagIds.map((tagId) => ({
          owner_id: userId,
          recurring_transaction_id: inserted.id,
          tag_id: tagId,
        }));

        const tagInsertResult = await this.supabase
          .from('recurring_transaction_tags')
          .insert(tagRows)
          .select('recurring_transaction_id');

        this.ensureNoErrorInsert(tagInsertResult);
      }

      await this.runBackfill(inserted.id);
      await this.refresh();
    } catch (error) {
      const message = this.describeError(error);
      logError(
        'RecurringPaymentsStore',
        'Failed to create recurring transaction:',
        error
      );
      this.state.update((state) => ({
        ...state,
        mutationPending: false,
        mutationError: message,
      }));
      throw new RecurringPaymentsStoreError(message);
    } finally {
      this.state.update((state) => ({
        ...state,
        mutationPending: false,
      }));
    }
  }

  async updateRecurringTransaction(
    recurringId: string,
    payload: UpdateRecurringTransactionPayload
  ): Promise<void> {
    const userId = this.requireUserId();
    this.state.update((state) => ({
      ...state,
      mutationPending: true,
      mutationError: null,
    }));

    const trimmedSchedule = payload.schedule.trim();
    const trimmedName = payload.name.trim();
    const wallet = this.resolveWallet(payload.walletId);
    if (!wallet) {
      throw new RecurringPaymentsStoreError(
        'modules.recurringPayments.form.fields.wallet.error'
      );
    }
    const currency =
      this.normalizeCurrency(payload.currency) ?? wallet.currency;

    try {
      const updateResult = await this.supabase
        .from('recurring_transactions')
        .update({
          owner_id: userId,
          category_id: payload.categoryId,
          name: trimmedName,
          start_date: payload.startDate,
          end_date: payload.endDate,
          schedule: trimmedSchedule,
          amount: payload.amountMode === 'variable' ? 0 : payload.amount,
          amount_mode: payload.amountMode,
          currency,
          exchange_rate: null,
          direction: payload.direction,
          wallet_id: wallet.id,
        })
        .eq('id', recurringId)
        .eq('owner_id', userId)
        .select('id')
        .single();

      this.ensureNoErrorSingle(updateResult);

      const clearTagsResult = await this.supabase
        .from('recurring_transaction_tags')
        .delete()
        .eq('owner_id', userId)
        .eq('recurring_transaction_id', recurringId)
        .select('tag_id');

      this.ensureNoErrorDelete(clearTagsResult);

      if (payload.tagIds.length > 0) {
        const tagRows = payload.tagIds.map((tagId) => ({
          owner_id: userId,
          recurring_transaction_id: recurringId,
          tag_id: tagId,
        }));

        const tagInsertResult = await this.supabase
          .from('recurring_transaction_tags')
          .insert(tagRows)
          .select('recurring_transaction_id');

        this.ensureNoErrorInsert(tagInsertResult);
      }

      await this.runBackfill(recurringId);
      this.editingId.set(null);
      await this.refresh();
    } catch (error) {
      const message = this.describeError(error);
      logError(
        'RecurringPaymentsStore',
        'Failed to update recurring transaction:',
        error
      );
      this.state.update((state) => ({
        ...state,
        mutationPending: false,
        mutationError: message,
      }));
      throw new RecurringPaymentsStoreError(message);
    } finally {
      this.state.update((state) => ({
        ...state,
        mutationPending: false,
      }));
    }
  }

  async deleteRecurringTransaction(recurringId: string): Promise<void> {
    const userId = this.requireUserId();
    this.state.update((state) => ({
      ...state,
      mutationPending: true,
      mutationError: null,
    }));

    if (this.editingId() === recurringId) {
      this.editingId.set(null);
    }

    try {
      const deleteResult = await this.supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', recurringId)
        .eq('owner_id', userId)
        .select('id');

      this.ensureNoErrorDelete(deleteResult);
      await this.refresh();
    } catch (error) {
      const message = this.describeError(error);
      logError(
        'RecurringPaymentsStore',
        'Failed to delete recurring transaction:',
        error
      );
      this.state.update((state) => ({
        ...state,
        mutationPending: false,
        mutationError: message,
      }));
      throw new RecurringPaymentsStoreError(message);
    } finally {
      this.state.update((state) => ({
        ...state,
        mutationPending: false,
      }));
    }
  }

  async stopRecurringTransaction(recurringId: string): Promise<void> {
    const userId = this.requireUserId();
    this.state.update((state) => ({
      ...state,
      mutationPending: true,
      mutationError: null,
    }));

    if (this.editingId() === recurringId) {
      this.editingId.set(null);
    }

    try {
      const updateResult = await this.supabase
        .from('recurring_transactions')
        .update({
          is_paused: true,
          paused_at: new Date().toISOString(),
        })
        .eq('id', recurringId)
        .eq('owner_id', userId)
        .select('id')
        .single();

      this.ensureNoErrorSingle(updateResult);
      await this.refresh();
    } catch (error) {
      const message = this.describeError(error);
      logError(
        'RecurringPaymentsStore',
        'Failed to stop recurring transaction:',
        error
      );
      this.state.update((state) => ({
        ...state,
        mutationPending: false,
        mutationError: message,
      }));
      throw new RecurringPaymentsStoreError(message);
    } finally {
      this.state.update((state) => ({
        ...state,
        mutationPending: false,
      }));
    }
  }

  async resumeRecurringTransaction(recurringId: string): Promise<void> {
    const userId = this.requireUserId();
    this.state.update((state) => ({
      ...state,
      mutationPending: true,
      mutationError: null,
    }));

    try {
      const updateResult = await this.supabase
        .from('recurring_transactions')
        .update({
          is_paused: false,
          paused_at: null,
          last_run_at: new Date().toISOString(),
        })
        .eq('id', recurringId)
        .eq('owner_id', userId)
        .select('id')
        .single();

      this.ensureNoErrorSingle(updateResult);
      await this.refresh();
    } catch (error) {
      const message = this.describeError(error);
      logError(
        'RecurringPaymentsStore',
        'Failed to resume recurring transaction:',
        error
      );
      this.state.update((state) => ({
        ...state,
        mutationPending: false,
        mutationError: message,
      }));
      throw new RecurringPaymentsStoreError(message);
    } finally {
      this.state.update((state) => ({
        ...state,
        mutationPending: false,
      }));
    }
  }

  async completePendingOccurrence(
    occurrenceId: string,
    amount: number
  ): Promise<void> {
    this.requireUserId();
    this.state.update((state) => ({
      ...state,
      mutationPending: true,
      mutationError: null,
    }));

    try {
      const result = await this.supabase.rpc(
        'complete_recurring_transaction_occurrence',
        {
          p_occurrence_id: occurrenceId,
          p_amount: amount,
        }
      );

      if (result.error) {
        throw result.error;
      }

      await this.refresh();
    } catch (error) {
      const message = this.describeError(error);
      logError(
        'RecurringPaymentsStore',
        'Failed to complete recurring occurrence:',
        error
      );
      this.state.update((state) => ({
        ...state,
        mutationPending: false,
        mutationError: message,
      }));
      throw new RecurringPaymentsStoreError(message);
    } finally {
      this.state.update((state) => ({
        ...state,
        mutationPending: false,
      }));
    }
  }

  private mapTransactionRow(
    row: RecurringTransactionRow,
    walletLookup: ReadonlyMap<string, WalletEntity>,
    categoryLookup: ReadonlyMap<string, RecurringCategorySummary>,
    recurringTags: ReadonlyMap<string, readonly RecurringTagSummary[]>
  ): RecurringTransactionEntity {
    const wallet = walletLookup.get(row.wallet_id ?? '');

    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      categoryId: row.category_id ?? '',
      startDate: new Date(row.start_date),
      endDate: row.end_date ? new Date(row.end_date) : null,
      schedule: row.schedule,
      amount: parseNumber(row.amount),
      amountMode: (row.amount_mode ?? 'fixed') as RecurringAmountMode,
      currency: row.currency,
      exchangeRate:
        row.exchange_rate != null ? parseNumber(row.exchange_rate) : null,
      direction: row.direction,
      category: categoryLookup.get(row.category_id) ?? null,
      tags: recurringTags.get(row.id) ?? [],
      walletId: wallet?.id ?? row.wallet_id,
      walletName: wallet?.name ?? null,
      isPaused: row.is_paused,
      pausedAt: row.paused_at ? new Date(row.paused_at) : null,
      sourceModule:
        row.source_module === 'allowance' ? 'allowance' : 'standard',
      allowanceConnectionId: row.allowance_connection_id ?? null,
    };
  }

  private isNaturallyEnded(
    transaction: RecurringTransactionEntity,
    now: Date
  ): boolean {
    if (!transaction.endDate) {
      return false;
    }

    const end = new Date(transaction.endDate);
    end.setHours(23, 59, 59, 999);
    return now.getTime() > end.getTime();
  }

  private mapOccurrenceRow(
    row: RecurringOccurrenceRow,
    transactionLookup: ReadonlyMap<string, RecurringTransactionEntity>
  ): RecurringOccurrenceEntity {
    const recurring = transactionLookup.get(row.recurring_transaction_id);

    return {
      id: row.id,
      recurringTransactionId: row.recurring_transaction_id,
      recurringName: recurring?.name ?? '',
      scheduledFor: new Date(row.scheduled_for),
      amount: row.amount == null ? null : parseNumber(row.amount),
      currency: row.currency,
      transactionId: row.transaction_id,
    };
  }

  private buildRecurringTagMap(
    rows: readonly RecurringTransactionTagRow[],
    tagLookup: ReadonlyMap<string, RecurringTagSummary>
  ): ReadonlyMap<string, readonly RecurringTagSummary[]> {
    const map = new Map<string, RecurringTagSummary[]>();

    for (const row of rows) {
      const tag = tagLookup.get(row.tag_id);
      if (!tag) {
        continue;
      }

      const existing = map.get(row.recurring_transaction_id);
      if (existing) {
        existing.push(tag);
      } else {
        map.set(row.recurring_transaction_id, [tag]);
      }
    }

    for (const [recurringId, tags] of map.entries()) {
      map.set(
        recurringId,
        [...tags].sort((a, b) => a.name.localeCompare(b.name))
      );
    }

    return map;
  }

  private mapOverviewStats(
    overviewRow: RecurringOverviewRow | null
  ): RecurringPaymentsStats {
    if (!overviewRow) {
      return {
        monthlyExpense: 0,
        yearlyExpense: 0,
      };
    }

    return {
      monthlyExpense: parseNumber(overviewRow.monthly_expense),
      yearlyExpense: parseNumber(overviewRow.yearly_expense),
    };
  }

  private mapCategoryRow(category: CategoryRow): RecurringCategorySummary {
    return {
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      groupId: category.group_id ?? null,
      parentId: category.parent_id ?? null,
    };
  }

  private mapGroupRow(group: CategoryGroupRow): RecurringCategoryGroupSummary {
    return {
      id: group.id,
      name: group.name,
      color: group.color,
      icon: group.icon,
    };
  }

  private mapTagRow(tag: TagRow): RecurringTagSummary {
    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      icon: tag.icon,
    };
  }

  private mapWalletRow(
    row: WalletRow,
    currencyLookup: ReadonlyMap<number, string>
  ): WalletEntity {
    const currencyId = row.currency_id ?? 1;
    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      isDefault: !!row.is_default,
      currencyId,
      currency: currencyLookup.get(currencyId) ?? DEFAULT_CURRENCY,
    };
  }

  private sortWallets(wallets: readonly WalletEntity[]): WalletEntity[] {
    return [...wallets].sort((a, b) => {
      if (a.isDefault && !b.isDefault) {
        return -1;
      }
      if (!a.isDefault && b.isDefault) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  private resolveWallet(
    candidate: string | null | undefined
  ): WalletEntity | null {
    const wallets = this.state().wallets;
    if (wallets.length === 0) {
      return null;
    }

    const normalized = candidate?.trim() ?? '';

    if (normalized) {
      const match = wallets.find((wallet) => wallet.id === normalized);
      if (match) {
        return match;
      }
    }

    const preferred = wallets.find((wallet) => wallet.isDefault);
    if (preferred) {
      return preferred;
    }

    return wallets[0] ?? null;
  }

  private sortCurrencies(
    currencies: readonly CurrencyOption[]
  ): CurrencyOption[] {
    return [...currencies].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  private normalizeCurrency(
    candidate: string | null | undefined
  ): string | null {
    const normalized = candidate?.trim().toUpperCase() ?? '';
    if (!/^[A-Z]{3}$/.test(normalized)) {
      return null;
    }

    const currencies = this.state().currencies;
    if (currencies.length === 0) {
      return normalized;
    }

    return currencies.some((currency) => currency.symbol === normalized)
      ? normalized
      : null;
  }

  private mapCurrencyRow(row: CurrencyRow): CurrencyOption {
    return {
      id: row.id,
      symbol: row.symbol.toUpperCase(),
    };
  }

  private async runBackfill(recurringId: string): Promise<void> {
    const result = await this.supabase.functions.invoke(
      'process-recurring-payments',
      {
        body: {
          recurringId,
          backfill: true,
        },
      }
    );

    if (result.error) {
      throw new RecurringPaymentsStoreError(
        'modules.recurringPayments.form.notifications.backfillError'
      );
    }

    const data = result.data as { skippedCount?: number } | null;
    if ((data?.skippedCount ?? 0) > 0) {
      throw new RecurringPaymentsStoreError(
        'modules.recurringPayments.form.notifications.backfillError'
      );
    }
  }

  private ensureNoErrorSingle<T>(result: PostgrestSingleResponse<T>): T {
    if (result.error) {
      throw result.error;
    }
    if (result.data === null) {
      throw new RecurringPaymentsStoreError('Missing data response.');
    }
    return result.data;
  }

  private ensureNoErrorMaybeSingle<T>(
    result: PostgrestSingleResponse<T | null>
  ): T | null {
    if (result.error) {
      throw result.error;
    }
    return result.data ?? null;
  }

  private ensureNoErrorArray<T>(result: PostgrestResponse<T>): T[] {
    if (result.error) {
      throw result.error;
    }
    return result.data ?? [];
  }

  private ensureNoErrorInsert(result: PostgrestResponse<unknown>): void {
    if (result.error) {
      throw result.error;
    }
  }

  private ensureNoErrorDelete(result: PostgrestResponse<unknown>): void {
    if (result.error) {
      throw result.error;
    }
  }

  private describeError(error: unknown): string {
    if (error instanceof RecurringPaymentsStoreError) {
      return error.message;
    }

    if (error && typeof error === 'object') {
      const maybePostgrestError = error as PostgrestError;

      if ('message' in maybePostgrestError && maybePostgrestError.message) {
        return maybePostgrestError.message;
      }
    }

    return 'Unexpected error';
  }

  private requireUserId(): string {
    const userId = this.userId();
    if (!userId) {
      throw new RecurringPaymentsStoreError('User is not authenticated.');
    }
    return userId;
  }
}

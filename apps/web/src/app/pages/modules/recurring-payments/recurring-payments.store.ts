import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  PostgrestError,
  PostgrestResponse,
  PostgrestSingleResponse,
  SupabaseClient,
} from '@supabase/supabase-js';
import { AuthService } from '../../../core/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase';
import type {
  CategoryRow,
  RecurringTransactionRow,
  RecurringTransactionsOverviewRow,
  TagRow,
  TransactionDirection,
  Tables,
} from '@spendist/data-access/supabase-types';

export type RecurringTransactionDirection = TransactionDirection;

export interface RecurringCategorySummary {
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
  readonly currency: string;
  readonly exchangeRate: number | null;
  readonly direction: RecurringTransactionDirection;
  readonly category: RecurringCategorySummary | null;
  readonly tags: readonly RecurringTagSummary[];
}

interface CurrencyOption {
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
  readonly categories: readonly RecurringCategorySummary[];
  readonly tags: readonly RecurringTagSummary[];
  readonly currencies: readonly CurrencyOption[];
  readonly defaultCurrency: string;
}

type RecurringOverviewRow = Readonly<
  Omit<RecurringTransactionsOverviewRow, 'monthly_expense' | 'yearly_expense' | 'recurring_transactions'> & {
    monthly_expense: number | string | null;
    yearly_expense: number | string | null;
  }
>;

type RecurringTransactionRowWithRelations = RecurringTransactionRow & {
  readonly category: ReadonlyArray<CategoryRow> | null;
  readonly tag_links: ReadonlyArray<{
    readonly tag: TagRow | null;
  }> | null;
};

type ProfileWithCurrency = {
  readonly id: string;
  readonly default_currency_id: number;
  readonly currency: ReadonlyArray<{ readonly symbol: string }> | null;
};

export interface CreateRecurringTransactionPayload {
  readonly name: string;
  readonly categoryId: string;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly schedule: string;
  readonly amount: number;
  readonly currency: string;
  readonly exchangeRate: number | null;
  readonly direction: RecurringTransactionDirection;
  readonly tagIds: readonly string[];
}

export type UpdateRecurringTransactionPayload = CreateRecurringTransactionPayload;

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
    categories: [],
    tags: [],
    currencies: [],
    defaultCurrency: DEFAULT_CURRENCY,
  });
  private readonly editingId = signal<string | null>(null);

  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly mutationPending = computed(() => this.state().mutationPending);
  readonly mutationError = computed(() => this.state().mutationError);
  readonly stats = computed(() => this.state().stats);
  readonly recurringTransactions = computed(() => this.state().recurringTransactions);
  readonly categories = computed(() => this.state().categories);
  readonly tags = computed(() => this.state().tags);
  readonly currencies = computed(() => this.state().currencies);
  readonly defaultCurrency = computed(() => this.state().defaultCurrency);
  readonly empty = computed(() => this.state().recurringTransactions.length === 0);
  readonly editingRecurring = computed<RecurringTransactionEntity | null>(() => {
    const id = this.editingId();
    if (!id) {
      return null;
    }
    return this.state().recurringTransactions.find((transaction) => transaction.id === id) ?? null;
  });
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
          categories: [],
          tags: [],
          currencies: [],
          defaultCurrency: DEFAULT_CURRENCY,
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

      const exists = currentState.recurringTransactions.some((transaction) => transaction.id === editingId);
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
        categories: [],
        tags: [],
        currencies: [],
        defaultCurrency: DEFAULT_CURRENCY,
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
        categoriesResult,
        tagsResult,
        profileResult,
        currenciesResult,
      ] = await Promise.all([
        this.supabase
          .from('recurring_transactions_overview')
          .select('*')
          .eq('owner_id', userId)
          .maybeSingle(),
        this.supabase
          .from('recurring_transactions')
          .select(
            `
              id,
              owner_id,
              name,
              category_id,
              start_date,
              end_date,
              schedule,
              amount,
              currency,
              exchange_rate,
              direction,
              category:categories (
                id,
                name,
                color,
                icon
              ),
              tag_links:recurring_transaction_tags (
                tag:tags (
                  id,
                  name,
                  color,
                  icon
                )
              )
            `,
          )
          .eq('owner_id', userId)
          .order('start_date', { ascending: true })
          .order('name', { ascending: true })
          .returns<RecurringTransactionRowWithRelations[]>(),
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
          .from('profiles')
          .select('id, default_currency_id, currency:currencies!profiles_default_currency_id_fkey(symbol)')
          .eq('id', userId)
          .maybeSingle(),
        this.supabase
          .from('currencies')
          .select('*')
          .order('symbol', { ascending: true }),
      ]);

      const overviewRow = this.ensureNoErrorMaybeSingle<RecurringOverviewRow>(overviewResult);
      const transactionRows = this.ensureNoErrorArray<RecurringTransactionRowWithRelations>(transactionsResult);
      const transactions = transactionRows.map((row) => this.mapTransactionRow(row));
      const categories = this.ensureNoErrorArray<CategoryRow>(categoriesResult).map((category) =>
        this.mapCategoryRow(category),
      );
      const tags = this.ensureNoErrorArray<TagRow>(tagsResult).map((tag) => this.mapTagRow(tag));
      const profile = this.ensureNoErrorMaybeSingle<ProfileWithCurrency>(profileResult);
      const currencies = this.sortCurrencies(
        this.ensureNoErrorArray<CurrencyRow>(currenciesResult).map((row) => this.mapCurrencyRow(row)),
      );

      const stats = this.mapOverviewStats(overviewRow);
      const profileCurrencySymbol = profile?.currency?.[0]?.symbol ?? null;
      const defaultCurrency =
        this.normalizeCurrency(profileCurrencySymbol, currencies) ??
        this.findCurrencySymbolById(currencies, profile?.default_currency_id) ??
        DEFAULT_CURRENCY;

      this.state.set({
        loading: false,
        error: null,
        mutationPending: false,
        mutationError: null,
        stats,
        recurringTransactions: transactions,
        categories,
        tags,
        currencies,
        defaultCurrency,
      });
    } catch (error) {
      const message = this.describeError(error);
      console.error('[RecurringPaymentsStore] Failed to refresh data:', error);
      this.state.update((state) => ({
        ...state,
        loading: false,
        error: message,
      }));
      throw new RecurringPaymentsStoreError(message);
    }
  }

  startEditing(recurringId: string): void {
    const transaction = this.state().recurringTransactions.find((item) => item.id === recurringId);
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

  async createRecurringTransaction(payload: CreateRecurringTransactionPayload): Promise<void> {
    const userId = this.requireUserId();
    this.state.update((state) => ({
      ...state,
      mutationPending: true,
      mutationError: null,
    }));

    const trimmedSchedule = payload.schedule.trim();
    const trimmedName = payload.name.trim();
    const normalizedCurrency = this.normalizeCurrency(payload.currency) ?? this.state().defaultCurrency;

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
          amount: payload.amount,
          currency: normalizedCurrency,
          exchange_rate: payload.exchangeRate,
          direction: payload.direction,
        })
        .select('id')
        .single();

      const inserted = this.ensureNoErrorSingle<Pick<RecurringTransactionRow, 'id'>>(insertResult);

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

      await this.refresh();
    } catch (error) {
      const message = this.describeError(error);
      console.error('[RecurringPaymentsStore] Failed to create recurring transaction:', error);
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
    payload: UpdateRecurringTransactionPayload,
  ): Promise<void> {
    const userId = this.requireUserId();
    this.state.update((state) => ({
      ...state,
      mutationPending: true,
      mutationError: null,
    }));

    const trimmedSchedule = payload.schedule.trim();
    const trimmedName = payload.name.trim();
    const normalizedCurrency = this.normalizeCurrency(payload.currency) ?? this.state().defaultCurrency;

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
          amount: payload.amount,
          currency: normalizedCurrency,
          exchange_rate: payload.exchangeRate,
          direction: payload.direction,
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

      this.editingId.set(null);
      await this.refresh();
    } catch (error) {
      const message = this.describeError(error);
      console.error('[RecurringPaymentsStore] Failed to update recurring transaction:', error);
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
      console.error('[RecurringPaymentsStore] Failed to delete recurring transaction:', error);
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

  private mapTransactionRow(row: RecurringTransactionRowWithRelations): RecurringTransactionEntity {
    const categoryRow = row.category?.[0] ?? null;
    const tags =
      row.tag_links
        ?.map((link) => link.tag)
        .filter((tag): tag is TagRow => Boolean(tag))
        .map((tag) => this.mapTagRow(tag)) ?? [];

    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      categoryId: row.category_id ?? '',
      startDate: new Date(row.start_date),
      endDate: row.end_date ? new Date(row.end_date) : null,
      schedule: row.schedule,
      amount: parseNumber(row.amount),
      currency: row.currency,
      exchangeRate: row.exchange_rate != null ? parseNumber(row.exchange_rate) : null,
      direction: row.direction,
      category: categoryRow ? this.mapCategoryRow(categoryRow) : null,
      tags,
    };
  }

  private mapOverviewStats(overviewRow: RecurringOverviewRow | null): RecurringPaymentsStats {
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

  private sortCurrencies(currencies: readonly CurrencyOption[]): CurrencyOption[] {
    return [...currencies].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  private mapCurrencyRow(row: CurrencyRow): CurrencyOption {
    return {
      id: row.id,
      symbol: row.symbol.toUpperCase(),
    };
  }

  private findCurrencySymbolById(
    currencies: readonly CurrencyOption[],
    id: number | null | undefined,
  ): string | null {
    if (id == null) {
      return null;
    }

    const match = currencies.find((currency) => currency.id === id);
    return match ? match.symbol : null;
  }

  private normalizeCurrency(
    input: string | null | undefined,
    currenciesOverride?: readonly CurrencyOption[],
  ): string | null {
    if (!input) {
      return null;
    }

    const trimmed = input.trim().toUpperCase();
    if (!trimmed) {
      return null;
    }

    if (!/^[A-Z]{3}$/.test(trimmed)) {
      return null;
    }

    if (!this.isSupportedCurrency(trimmed, currenciesOverride)) {
      return null;
    }

    return trimmed;
  }

  private isSupportedCurrency(symbol: string, currenciesOverride?: readonly CurrencyOption[]): boolean {
    const currencies = currenciesOverride ?? this.state().currencies;
    if (currencies.length === 0) {
      return true;
    }

    return currencies.some((currency) => currency.symbol === symbol);
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

  private ensureNoErrorMaybeSingle<T>(result: PostgrestSingleResponse<T | null>): T | null {
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

      if (maybePostgrestError.code === '23505' && maybePostgrestError.message?.includes('recurring_transactions_owner_name_idx')) {
        return 'modules.recurringPayments.form.notifications.duplicateName';
      }

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

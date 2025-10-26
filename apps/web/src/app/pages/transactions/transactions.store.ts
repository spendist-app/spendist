import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from '../../core/auth.service';
import { SUPABASE_CLIENT } from '../../core/supabase';
import type {
  CategoryRow,
  CategoryGroupRow,
  TagRow,
  TransactionDirection,
  TransactionRow,
  TransactionTagRow,
  WalletRow,
  Tables,
} from '@spendist/data-access/supabase-types';
import type { CategoryEntity, CategoryGroupEntity } from '../settings/settings.store';
const FALLBACK_CURRENCY = 'PLN';
const MAX_BULK_QUANTITY = 100;
type CurrencyRow = Tables<'currencies'>;

interface TransactionEntity {
  readonly id: string;
  readonly ownerId: string;
  readonly categoryId: string;
  readonly occurredAt: Date;
  readonly description: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly direction: TransactionDirection;
  readonly isAutomatic: boolean;
  readonly exchangeRate: number | null;
}

interface TransactionsState {
  readonly loading: boolean;
  readonly error: string | null;
  readonly mutationError: string | null;
  readonly transactionMutationPending: boolean;
  readonly categories: readonly CategoryEntity[];
  readonly groups: readonly CategoryGroupEntity[];
  readonly transactions: readonly TransactionEntity[];
  readonly tags: readonly TagEntity[];
  readonly wallets: readonly WalletEntity[];
  readonly currencies: readonly CurrencyOption[];
  readonly defaultCurrency: string | null;
  readonly transactionTags: ReadonlyMap<string, readonly string[]>;
}

export interface TagEntity {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly color: string | null;
  readonly icon: string | null;
}

export interface WalletEntity {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
}

export type TransactionPresetId = 'currentMonth' | 'previousMonth' | 'thisYear' | 'lastYear' | 'allTime' | 'custom';

interface TransactionsFilters {
  readonly selectedCategoryIds: readonly string[];
  readonly searchTerm: string;
  readonly from: Date | null;
  readonly to: Date | null;
  readonly preset: TransactionPresetId;
}

interface GroupWithCategories extends CategoryGroupEntity {
  readonly categories: readonly CategoryEntity[];
}

export interface TransactionViewModel extends TransactionEntity {
  readonly category: CategoryEntity | null;
  readonly group: CategoryGroupEntity | null;
  readonly tagIds: readonly string[];
}

interface CurrencyOption {
  readonly id: number;
  readonly symbol: string;
}

interface ProfileCurrencyRow {
  readonly default_currency_id: number;
  readonly currency: ReadonlyArray<{ readonly symbol: string }> | null;
}

export interface CreateTransactionPayload {
  readonly description: string | null;
  readonly categoryId: string;
  readonly occurredAt: Date;
  readonly amount: number;
  readonly currency?: string | null;
  readonly direction: TransactionDirection;
  readonly quantity: number;
  readonly tagIds: readonly string[];
  readonly foreignAmount?: number | null;
  readonly foreignCurrency?: string | null;
  readonly walletId?: string | null;
}

export type UpdateTransactionPayload = Omit<CreateTransactionPayload, 'quantity'>;

interface NormalizedCreatePayload {
  readonly categoryId: string;
  readonly description: string | null;
  readonly occurredAt: Date;
  readonly amount: number;
  readonly currency: string;
  readonly direction: TransactionDirection;
  readonly quantity: number;
  readonly tagIds: readonly string[];
  readonly exchangeRate: number | null;
}

interface NormalizedUpdatePayload {
  readonly categoryId: string;
  readonly description: string | null;
  readonly occurredAt: Date;
  readonly amount: number;
  readonly currency: string;
  readonly direction: TransactionDirection;
  readonly tagIds: readonly string[];
  readonly exchangeRate: number | null;
}

@Injectable()
export class TransactionsStore {
  private readonly supabase = inject<SupabaseClient>(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);

  private readonly userId = signal<string | null>(null);
  private readonly state = signal<TransactionsState>({
    loading: true,
    error: null,
    mutationError: null,
    transactionMutationPending: false,
    categories: [],
    groups: [],
    transactions: [],
    tags: [],
    wallets: [],
    currencies: [],
    defaultCurrency: null,
    transactionTags: new Map(),
  });

  private readonly filters = signal<TransactionsFilters>(this.createInitialFilters());

  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly mutationError = computed(() => this.state().mutationError);
  readonly transactionMutationPending = computed(() => this.state().transactionMutationPending);
  readonly categories = computed(() => this.state().categories);
  readonly groups = computed(() => this.state().groups);
  readonly transactions = computed(() => this.state().transactions);
  readonly tags = computed(() => this.state().tags);
  readonly wallets = computed(() => this.state().wallets);
  readonly currencies = computed(() => this.state().currencies);
  readonly defaultCurrency = computed(() => this.state().defaultCurrency ?? FALLBACK_CURRENCY);
  readonly activeFilters = computed(() => {
    const filters = this.filters();
    return {
      ...filters,
      from: filters.from ? new Date(filters.from) : null,
      to: filters.to ? new Date(filters.to) : null,
      selectedCategoryIds: [...filters.selectedCategoryIds],
    };
  });

  readonly hasActiveCategoryFilter = computed(() => this.filters().selectedCategoryIds.length > 0);
  readonly groupedCategories = computed<readonly GroupWithCategories[]>(() => {
    const groups = this.state().groups;
    const categories = this.state().categories;

    return groups
      .map((group) => ({
        ...group,
        categories: categories.filter((category) => category.groupId === group.id),
      }))
      .filter((group) => group.categories.length > 0);
  });

  readonly ungroupedCategories = computed(() =>
    this.state()
      .categories.filter((category) => !category.groupId)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  readonly transactionsView = computed<readonly TransactionViewModel[]>(() => {
    const state = this.state();
    const categoriesById = new Map(state.categories.map((category) => [category.id, category]));
    const groupsById = new Map(state.groups.map((group) => [group.id, group]));
    const tagsMap = state.transactionTags;

    return state.transactions.map((transaction) => {
      const category = categoriesById.get(transaction.categoryId) ?? null;
      const group = category?.groupId ? groupsById.get(category.groupId) ?? null : null;
      return {
        ...transaction,
        category,
        group,
        tagIds: tagsMap.get(transaction.id) ?? [],
      };
    });
  });

  readonly filteredTransactions = computed(() => {
    const filters = this.filters();
    const searchTerm = filters.searchTerm.trim().toLowerCase();
    const categoryFilter = new Set(filters.selectedCategoryIds);
    const fromTime = filters.from ? this.startOfDay(filters.from).getTime() : Number.NEGATIVE_INFINITY;
    const toTime = filters.to ? this.endOfDay(filters.to).getTime() : Number.POSITIVE_INFINITY;

    return this.transactionsView()
      .filter((transaction) => {
        if (categoryFilter.size > 0 && !categoryFilter.has(transaction.categoryId)) {
          return false;
        }

        const occurredAtTime = transaction.occurredAt.getTime();
        if (occurredAtTime < fromTime || occurredAtTime > toTime) {
          return false;
        }

        if (!searchTerm) {
          return true;
        }

        const haystack = [
          transaction.description ?? '',
          transaction.category?.name ?? '',
          transaction.group?.name ?? '',
          transaction.currency ?? '',
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(searchTerm);
      })
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  });

  readonly availableYears = computed(() => {
    const years = new Set<number>();
    for (const transaction of this.state().transactions) {
      years.add(transaction.occurredAt.getFullYear());
    }

    if (years.size === 0) {
      years.add(new Date().getFullYear());
    }

    return Array.from(years).sort((a, b) => b - a);
  });

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
          mutationError: null,
          transactionMutationPending: false,
          categories: [],
          groups: [],
          transactions: [],
          tags: [],
          wallets: [],
          currencies: [],
          defaultCurrency: null,
          transactionTags: new Map(),
        });
        this.filters.set(this.createInitialFilters());
        return;
      }

      const currentUserId = session.user.id;
      if (this.userId() === currentUserId) {
        return;
      }

      this.userId.set(currentUserId);
      this.filters.set(this.createInitialFilters());
      void this.refresh();
    });
  }

  tagIdsForTransaction(transactionId: string): readonly string[] {
    return this.state().transactionTags.get(transactionId) ?? [];
  }

  getTransactionForEdit(transactionId: string): TransactionViewModel | null {
    return this.transactionsView().find((transaction) => transaction.id === transactionId) ?? null;
  }

  async refresh(): Promise<void> {
    const userId = this.userId();
    if (!userId) {
      return;
    }

    this.state.update((state) => ({
      ...state,
      loading: true,
      error: null,
    }));

    try {
      const [
        groupsResult,
        categoriesResult,
        transactionsResult,
        tagsResult,
        walletsResult,
        profileResult,
        currenciesResult,
        transactionTagsResult,
      ] =
        await Promise.all([
          this.supabase.from('categories_group').select('*').eq('owner_id', userId).order('name', { ascending: true }),
          this.supabase.from('categories').select('*').eq('owner_id', userId).order('name', { ascending: true }),
          this.supabase.from('transactions').select('*').eq('owner_id', userId).order('occurred_at', { ascending: false }),
          this.supabase.from('tags').select('*').eq('owner_id', userId).order('name', { ascending: true }),
          this.supabase.from('wallets').select('*').eq('owner_id', userId).order('name', { ascending: true }),
          this.supabase
            .from('profiles')
            .select('default_currency_id, currency:currencies!profiles_default_currency_id_fkey(symbol)')
            .eq('id', userId)
            .single<ProfileCurrencyRow>(),
          this.supabase.from('currencies').select('*').order('symbol', { ascending: true }),
          this.supabase.from('transaction_tags').select('*').eq('owner_id', userId),
        ]);

      if (groupsResult.error) {
        throw groupsResult.error;
      }

      if (categoriesResult.error) {
        throw categoriesResult.error;
      }

      if (transactionsResult.error) {
        throw transactionsResult.error;
      }

      if (tagsResult.error) {
        throw tagsResult.error;
      }

      if (walletsResult.error) {
        throw walletsResult.error;
      }

      if (profileResult.error) {
        throw profileResult.error;
      }

      if (currenciesResult.error) {
        throw currenciesResult.error;
      }

      if (transactionTagsResult.error) {
        throw transactionTagsResult.error;
      }

      const groups = this.sortGroups(
        (groupsResult.data ?? []).map((group) => this.mapGroupRow(group as CategoryGroupRow)),
      );
      const categories = this.sortCategories(
        (categoriesResult.data ?? []).map((category) => this.mapCategoryRow(category as CategoryRow)),
      );
      const transactions = (transactionsResult.data ?? []).map((transaction) =>
        this.mapTransactionRow(transaction as TransactionRow),
      );
      const tags = this.sortTags((tagsResult.data ?? []).map((tag) => this.mapTagRow(tag as TagRow)));
      const wallets = this.sortWallets((walletsResult.data ?? []).map((wallet) => this.mapWalletRow(wallet as WalletRow)));
      const currencies = this.sortCurrencies((currenciesResult.data ?? []).map((row) => this.mapCurrencyRow(row as CurrencyRow)));
      const profileCurrencySymbol = profileResult.data?.currency?.[0]?.symbol ?? null;
      const defaultCurrency =
        this.normalizeCurrency(profileCurrencySymbol, currencies) ??
        this.findCurrencySymbolById(currencies, profileResult.data?.default_currency_id) ??
        FALLBACK_CURRENCY;
      const transactionTags = this.buildTransactionTagsMap(
        (transactionTagsResult.data ?? []).map((row) => row as TransactionTagRow),
      );

      this.state.set({
        loading: false,
        error: null,
        mutationError: this.state().mutationError,
        transactionMutationPending: false,
        categories,
        groups,
        transactions,
        tags,
        wallets,
        currencies,
        defaultCurrency,
        transactionTags,
      });
    } catch (error) {
      const message = this.describeError(error);
      console.error('[TransactionsStore] Failed to load transactions', error);
      this.state.update((state) => ({
        ...state,
        loading: false,
        error: message,
        transactionMutationPending: false,
      }));
    }
  }

  applyPreset(preset: TransactionPresetId): void {
    const current = this.filters();
    if (preset === 'custom') {
      this.filters.set({
        ...current,
        preset,
      });
      return;
    }

    const { from, to } = this.resolvePresetRange(preset);
    this.filters.set({
      ...current,
      preset,
      from,
      to,
    });
  }

  setCustomDateRange(from: Date | null, to: Date | null): void {
    const sanitized = this.normalizeDateRange(from, to);
    this.filters.set({
      ...this.filters(),
      preset: 'custom',
      from: sanitized.from,
      to: sanitized.to,
    });
  }

  setSearchTerm(term: string): void {
    this.filters.update((filters) => ({
      ...filters,
      searchTerm: term,
    }));
  }

  toggleCategorySelection(categoryId: string): void {
    this.filters.update((filters) => {
      const set = new Set(filters.selectedCategoryIds);
      if (set.has(categoryId)) {
        set.delete(categoryId);
      } else {
        set.add(categoryId);
      }

      return {
        ...filters,
        selectedCategoryIds: Array.from(set),
      };
    });
  }

  clearCategorySelection(): void {
    this.filters.update((filters) => ({
      ...filters,
      selectedCategoryIds: [],
    }));
  }

  setSelectedMonth(year: number, monthIndex: number): void {
    const range = this.monthRange(year, monthIndex);
    this.filters.update((filters) => ({
      ...filters,
      preset: 'custom',
      from: range.from,
      to: range.to,
    }));
  }

  setSelectedYear(year: number): void {
    const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const to = this.endOfDay(new Date(Date.UTC(year, 11, 31, 0, 0, 0, 0)));

    this.filters.update((filters) => ({
      ...filters,
      preset: 'custom',
      from,
      to,
    }));
  }

  resetFilters(): void {
    this.filters.set(this.createInitialFilters());
  }

  dismissMutationError(): void {
    this.state.update((state) => ({
      ...state,
      mutationError: null,
    }));
  }

  async ensureTags(names: readonly string[]): Promise<readonly TagEntity[]> {
    const userId = this.userId();
    if (!userId) {
      throw new Error('You need to be signed in to manage tags.');
    }

    const sanitized = Array.from(
      new Set(
        names
          .map((name) => this.normalizeTagName(name))
          .filter((name): name is string => !!name),
      ),
    );

    if (sanitized.length === 0) {
      return [];
    }

    const currentState = this.state();
    const existingByName = new Map(currentState.tags.map((tag) => [tag.name.toLowerCase(), tag]));
    const result: TagEntity[] = [];
    const toCreate: string[] = [];

    for (const name of sanitized) {
      const existing = existingByName.get(name.toLowerCase());
      if (existing) {
        result.push(existing);
      } else {
        toCreate.push(name);
      }
    }

    if (toCreate.length > 0) {
      const { data, error } = await this.supabase
        .from('tags')
        .insert(
          toCreate.map((name) => ({
            owner_id: userId,
            name,
          })),
        )
        .select('*');

      if (error) {
        throw error;
      }

      const createdTags = (data ?? []).map((row) => this.mapTagRow(row as TagRow));
      result.push(...createdTags);

      this.state.update((state) => ({
        ...state,
        tags: this.sortTags([...state.tags, ...createdTags]),
      }));
    }

    const lookup = new Map(this.state().tags.map((tag) => [tag.name.toLowerCase(), tag]));
    return sanitized
      .map((name) => lookup.get(name.toLowerCase()))
      .filter((tag): tag is TagEntity => !!tag);
  }

  async createTransactions(payload: CreateTransactionPayload): Promise<{ success: boolean; error?: string }> {
    const userId = this.userId();
    if (!userId) {
      const message = 'You need to be signed in to create transactions.';
      return { success: false, error: message };
    }

    const normalized = this.normalizeCreatePayload(payload);
    if (!normalized) {
      const message = 'Invalid transaction data. Please review the form and try again.';
      return { success: false, error: message };
    }

    this.state.update((state) => ({
      ...state,
      transactionMutationPending: true,
      mutationError: null,
    }));

    try {
      const rows = Array.from({ length: normalized.quantity }, () => ({
        owner_id: userId,
        category_id: normalized.categoryId,
        description: normalized.description,
        occurred_at: normalized.occurredAt.toISOString(),
        amount: normalized.amount,
        currency: normalized.currency,
        direction: normalized.direction,
        is_automatic: false,
        exchange_rate: normalized.exchangeRate,
      }));

      const { data: inserted, error } = await this.supabase.from('transactions').insert(rows).select('id');
      if (error) {
        throw error;
      }

      const transactionRows = inserted ?? [];
      if (transactionRows.length === 0) {
        throw new Error('Transaction could not be created.');
      }

      if (normalized.tagIds.length > 0) {
        const tagRows = transactionRows.flatMap((transaction) =>
          normalized.tagIds.map((tagId) => ({
            owner_id: userId,
            transaction_id: transaction.id,
            tag_id: tagId,
          })),
        );

        const { error: tagError } = await this.supabase.from('transaction_tags').insert(tagRows);
        if (tagError) {
          throw tagError;
        }
      }

      await this.refresh();
      this.state.update((state) => ({
        ...state,
        transactionMutationPending: false,
        mutationError: null,
      }));

      return { success: true };
    } catch (error) {
      const message = this.describeError(error);
      console.error('[TransactionsStore] Failed to create transaction', error);
      this.state.update((state) => ({
        ...state,
        transactionMutationPending: false,
        mutationError: message,
      }));
      return { success: false, error: message };
    }
  }

  async updateTransaction(
    transactionId: string,
    payload: UpdateTransactionPayload,
  ): Promise<{ success: boolean; error?: string }> {
    const userId = this.userId();
    if (!userId) {
      const message = 'You need to be signed in to update transactions.';
      return { success: false, error: message };
    }

    const normalized = this.normalizeUpdatePayload(payload);
    if (!normalized) {
      const message = 'Invalid transaction data. Please review the form and try again.';
      return { success: false, error: message };
    }

    this.state.update((state) => ({
      ...state,
      transactionMutationPending: true,
      mutationError: null,
    }));

    try {
      const { error: updateError } = await this.supabase
        .from('transactions')
        .update({
          category_id: normalized.categoryId,
          description: normalized.description,
          occurred_at: normalized.occurredAt.toISOString(),
          amount: normalized.amount,
          currency: normalized.currency,
          direction: normalized.direction,
          exchange_rate: normalized.exchangeRate,
        })
        .eq('owner_id', userId)
        .eq('id', transactionId);

      if (updateError) {
        throw updateError;
      }

      const { error: deleteTagsError } = await this.supabase
        .from('transaction_tags')
        .delete()
        .eq('owner_id', userId)
        .eq('transaction_id', transactionId);

      if (deleteTagsError) {
        throw deleteTagsError;
      }

      if (normalized.tagIds.length > 0) {
        const tagRows = normalized.tagIds.map((tagId) => ({
          owner_id: userId,
          transaction_id: transactionId,
          tag_id: tagId,
        }));
        const { error: insertTagsError } = await this.supabase.from('transaction_tags').insert(tagRows);
        if (insertTagsError) {
          throw insertTagsError;
        }
      }

      await this.refresh();
      this.state.update((state) => ({
        ...state,
        transactionMutationPending: false,
        mutationError: null,
      }));

      return { success: true };
    } catch (error) {
      const message = this.describeError(error);
      console.error('[TransactionsStore] Failed to update transaction', error);
      this.state.update((state) => ({
        ...state,
        transactionMutationPending: false,
        mutationError: message,
      }));
      return { success: false, error: message };
    }
  }

  async deleteTransaction(transactionId: string): Promise<{ success: boolean; error?: string }> {
    const userId = this.userId();
    if (!userId) {
      const message = 'You need to be signed in to delete transactions.';
      return { success: false, error: message };
    }

    this.state.update((state) => ({
      ...state,
      transactionMutationPending: true,
      mutationError: null,
    }));

    try {
      const { error } = await this.supabase
        .from('transactions')
        .delete()
        .eq('owner_id', userId)
        .eq('id', transactionId);

      if (error) {
        throw error;
      }

      await this.refresh();
      this.state.update((state) => ({
        ...state,
        transactionMutationPending: false,
        mutationError: null,
      }));

      return { success: true };
    } catch (error) {
      const message = this.describeError(error);
      console.error('[TransactionsStore] Failed to delete transaction', error);
      this.state.update((state) => ({
        ...state,
        transactionMutationPending: false,
        mutationError: message,
      }));
      return { success: false, error: message };
    }
  }

  private createInitialFilters(): TransactionsFilters {
    const now = new Date();
    const { from, to } = this.monthRange(now.getUTCFullYear(), now.getUTCMonth());
    return {
      selectedCategoryIds: [],
      searchTerm: '',
      preset: 'currentMonth',
      from,
      to,
    };
  }

  private resolvePresetRange(preset: TransactionPresetId): { from: Date | null; to: Date | null } {
    const now = new Date();
    switch (preset) {
      case 'currentMonth':
        return this.monthRange(now.getUTCFullYear(), now.getUTCMonth());
      case 'previousMonth': {
        const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
        const month = (now.getUTCMonth() + 11) % 12;
        return this.monthRange(year, month);
      }
      case 'thisYear': {
        const year = now.getUTCFullYear();
        return {
          from: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
          to: this.endOfDay(new Date(Date.UTC(year, 11, 31, 0, 0, 0, 0))),
        };
      }
      case 'lastYear': {
        const year = now.getUTCFullYear() - 1;
        return {
          from: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
          to: this.endOfDay(new Date(Date.UTC(year, 11, 31, 0, 0, 0, 0))),
        };
      }
      case 'allTime':
        return {
          from: null,
          to: null,
        };
      case 'custom':
      default:
        return {
          from: null,
          to: null,
        };
    }
  }

  private normalizeDateRange(from: Date | null, to: Date | null): { from: Date | null; to: Date | null } {
    if (!from && !to) {
      return { from: null, to: null };
    }

    if (from && to && from.getTime() > to.getTime()) {
      return {
        from: this.startOfDay(to),
        to: this.endOfDay(from),
      };
    }

    return {
      from: from ? this.startOfDay(from) : null,
      to: to ? this.endOfDay(to) : null,
    };
  }

  private monthRange(year: number, monthIndex: number): { from: Date; to: Date } {
    const from = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const to = this.endOfDay(new Date(Date.UTC(year, monthIndex + 1, 0, 0, 0, 0, 0)));
    return { from, to };
  }

  private startOfDay(value: Date): Date {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0));
  }

  private endOfDay(value: Date): Date {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999));
  }

  private sortGroups(groups: readonly CategoryGroupEntity[]): CategoryGroupEntity[] {
    return [...groups].sort((a, b) => a.name.localeCompare(b.name));
  }

  private sortCategories(categories: readonly CategoryEntity[]): CategoryEntity[] {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }

  private sortTags(tags: readonly TagEntity[]): TagEntity[] {
    return [...tags].sort((a, b) => a.name.localeCompare(b.name));
  }

  private sortWallets(wallets: readonly WalletEntity[]): WalletEntity[] {
    return [...wallets].sort((a, b) => a.name.localeCompare(b.name));
  }

  private sortCurrencies(currencies: readonly CurrencyOption[]): CurrencyOption[] {
    return [...currencies].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  private mapTransactionRow(row: TransactionRow): TransactionEntity {
    const amount = typeof row.amount === 'number' ? row.amount : Number(row.amount);
    const exchangeRate =
      typeof row.exchange_rate === 'number'
        ? row.exchange_rate
        : row.exchange_rate != null
          ? Number(row.exchange_rate)
          : null;

    return {
      id: row.id,
      ownerId: row.owner_id,
      categoryId: row.category_id,
      occurredAt: new Date(row.occurred_at),
      description: row.description ?? null,
      amount: Number.isFinite(amount) ? amount : 0,
      currency: row.currency,
      direction: row.direction,
      isAutomatic: !!row.is_automatic,
      exchangeRate: Number.isFinite(exchangeRate ?? NaN) ? (exchangeRate as number) : null,
    };
  }

  private mapCurrencyRow(row: CurrencyRow): CurrencyOption {
    return {
      id: row.id,
      symbol: row.symbol.toUpperCase(),
    };
  }

  private mapGroupRow(row: CategoryGroupRow): CategoryGroupEntity {
    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      color: row.color,
      icon: row.icon,
    };
  }

  private mapCategoryRow(row: CategoryRow): CategoryEntity {
    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      groupId: row.group_id,
    };
  }

  private mapTagRow(row: TagRow): TagEntity {
    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      color: row.color,
      icon: row.icon,
    };
  }

  private mapWalletRow(row: WalletRow): WalletEntity {
    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
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

  private buildTransactionTagsMap(rows: readonly TransactionTagRow[]): ReadonlyMap<string, readonly string[]> {
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const existing = map.get(row.transaction_id);
      if (existing) {
        existing.push(row.tag_id);
      } else {
        map.set(row.transaction_id, [row.tag_id]);
      }
    }
    return new Map(Array.from(map.entries(), ([id, tagIds]) => [id, Object.freeze(tagIds.slice())]));
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

  private normalizeTagName(name: string | null | undefined): string | null {
    if (!name) {
      return null;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      return null;
    }

    return trimmed.length > 60 ? trimmed.slice(0, 60) : trimmed;
  }

  private normalizeCreatePayload(payload: CreateTransactionPayload): NormalizedCreatePayload | null {
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    const rawQuantity = Math.floor(payload.quantity ?? 1);
    const quantity = Math.max(1, Math.min(rawQuantity, MAX_BULK_QUANTITY));

    if (!payload.categoryId) {
      return null;
    }

    if (!(payload.occurredAt instanceof Date) || Number.isNaN(payload.occurredAt.getTime())) {
      return null;
    }

    const description = payload.description?.trim() ?? '';
    const tagIds = Array.from(new Set(payload.tagIds ?? [])).filter(Boolean);
    const defaultCurrency = this.defaultCurrency();
    const selectedCurrency = this.normalizeCurrency(payload.currency ?? defaultCurrency) ?? defaultCurrency;

    let exchangeRate: number | null = null;
    if (
      payload.foreignAmount &&
      payload.foreignAmount > 0 &&
      payload.foreignCurrency &&
      this.normalizeCurrency(payload.foreignCurrency)
    ) {
      exchangeRate = amount / payload.foreignAmount;
    }

    return {
      categoryId: payload.categoryId,
      description: description || null,
      occurredAt: this.startOfDay(payload.occurredAt),
      amount,
      currency: selectedCurrency,
      direction: payload.direction,
      quantity,
      tagIds,
      exchangeRate,
    };
  }

  private normalizeUpdatePayload(payload: UpdateTransactionPayload): NormalizedUpdatePayload | null {
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    if (!payload.categoryId) {
      return null;
    }

    if (!(payload.occurredAt instanceof Date) || Number.isNaN(payload.occurredAt.getTime())) {
      return null;
    }

    const description = payload.description?.trim() ?? '';
    const tagIds = Array.from(new Set(payload.tagIds ?? [])).filter(Boolean);
    const defaultCurrency = this.defaultCurrency();
    const selectedCurrency = this.normalizeCurrency(payload.currency ?? defaultCurrency) ?? defaultCurrency;

    let exchangeRate: number | null = null;
    if (
      payload.foreignAmount &&
      payload.foreignAmount > 0 &&
      payload.foreignCurrency &&
      this.normalizeCurrency(payload.foreignCurrency)
    ) {
      exchangeRate = amount / payload.foreignAmount;
    }

    return {
      categoryId: payload.categoryId,
      description: description || null,
      occurredAt: this.startOfDay(payload.occurredAt),
      amount,
      currency: selectedCurrency,
      direction: payload.direction,
      tagIds,
      exchangeRate,
    };
  }

  private describeError(error: unknown): string {
    if (!error) {
      return 'Unknown error. Please try again.';
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      const candidate = (error as Record<string, unknown>)['message'];
      if (typeof candidate === 'string') {
        return candidate;
      }
      return 'Request failed. Please try again.';
    }

    return 'Request failed. Please try again.';
  }
}

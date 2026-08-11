import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { logError } from '../../core/logger';
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
  PlaceRow,
  Json,
  Tables,
} from '@spendist/data-access/supabase-types';
import type { TransactionImportContext } from './transaction-import.models';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '../settings/settings.store';
const FALLBACK_CURRENCY = 'PLN';
const MAX_BULK_QUANTITY = 100;
const SUPABASE_PAGE_SIZE = 1000;
const TRANSACTION_TAG_QUERY_BATCH_SIZE = 100;
const FIRST_TRANSACTION_PAGE = 0;
type CurrencyRow = Tables<'currencies'>;

interface TransactionEntity {
  readonly id: string;
  readonly ownerId: string;
  readonly categoryId: string;
  readonly occurredAt: Date;
  readonly description: string | null;
  readonly amount: number;
  readonly amountInDefault: number;
  readonly currency: string;
  readonly direction: TransactionDirection;
  readonly isAutomatic: boolean;
  readonly recurringTransactionId: string | null;
  readonly recurringTransactionName: string | null;
  readonly recurringScheduledFor: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly exchangeRate: number | null;
  readonly walletId: string;
  readonly placeId: string | null;
  readonly sourceModule: 'standard' | 'allowance';
  readonly allowancePairId: string | null;
  readonly allowanceRole: 'payer' | 'recipient' | null;
  readonly allowanceConnectionId: string | null;
}

interface TransactionsState {
  readonly loading: boolean;
  readonly error: string | null;
  readonly mutationError: string | null;
  readonly transactionMutationPending: boolean;
  readonly categories: readonly CategoryEntity[];
  readonly groups: readonly CategoryGroupEntity[];
  readonly transactions: readonly TransactionEntity[];
  readonly transactionPage: number;
  readonly totalMatchingTransactions: number;
  readonly hasMoreTransactions: boolean;
  readonly loadingMoreTransactions: boolean;
  readonly tags: readonly TagEntity[];
  readonly wallets: readonly WalletEntity[];
  readonly places: readonly PlaceEntity[];
  readonly currencies: readonly CurrencyOption[];
  readonly defaultCurrency: string | null;
  readonly availableYears: readonly number[];
  readonly transactionTags: ReadonlyMap<string, readonly string[]>;
  readonly categorySummaries: ReadonlyMap<string, CategoryExpenseSummary>;
  readonly groupSummaries: ReadonlyMap<string | null, GroupExpenseSummary>;
  readonly tagSummaries: ReadonlyMap<string, TagExpenseSummary>;
  readonly summaryLoading: boolean;
  readonly summaryError: string | null;
  readonly allowanceConnections: readonly AllowanceConnectionOption[];
}

export interface AllowanceConnectionOption {
  readonly id: string;
  readonly counterpartName: string;
}

interface AllowanceConnectionRpcRow {
  readonly id: string | null;
  readonly role: string | null;
  readonly counterpart_name: string | null;
  readonly status: string | null;
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
  readonly isDefault: boolean;
  readonly currencyId: number;
  readonly currency: string;
}

export interface PlaceEntity {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly street: string | null;
  readonly city: string | null;
  readonly postalCode: string | null;
  readonly country: string | null;
  readonly note: string | null;
}

export type TransactionPresetId =
  | 'currentMonth'
  | 'previousMonth'
  | 'thisYear'
  | 'lastYear'
  | 'allTime'
  | 'custom';

export type TransactionSortId =
  | 'dateDesc'
  | 'dateAsc'
  | 'amountDesc'
  | 'amountAsc'
  | 'descriptionAsc'
  | 'descriptionDesc';

export interface TransactionsFilters {
  readonly selectedCategoryIds: readonly string[];
  readonly selectedTagIds: readonly string[];
  readonly selectedPlaceId: string | null;
  readonly minimumAmount: number | null;
  readonly maximumAmount: number | null;
  readonly searchTerm: string;
  readonly from: Date | null;
  readonly to: Date | null;
  readonly preset: TransactionPresetId;
  readonly sort: TransactionSortId;
}

interface GroupWithCategories extends CategoryGroupEntity {
  readonly categories: readonly CategoryEntity[];
}

export interface TransactionViewModel extends TransactionEntity {
  readonly category: CategoryEntity | null;
  readonly group: CategoryGroupEntity | null;
  readonly tagIds: readonly string[];
  readonly place: PlaceEntity | null;
}

interface CurrencyOption {
  readonly id: number;
  readonly symbol: string;
}

interface CategoryExpenseSummary {
  readonly totalAmount: number;
  readonly transactionCount: number;
}

interface GroupExpenseSummary {
  readonly totalAmount: number;
  readonly transactionCount: number;
}

export interface TagExpenseSummary extends TagEntity {
  readonly totalAmount: number;
  readonly transactionCount: number;
}

interface TransactionTagExpenseSummaryRow {
  readonly tag_id: string;
  readonly tags:
    | {
        readonly name: string;
        readonly color: string | null;
        readonly icon: string | null;
      }
    | readonly {
        readonly name: string;
        readonly color: string | null;
        readonly icon: string | null;
      }[]
    | null;
  readonly transactions:
    | {
        readonly amount_in_default: number | string | null;
      }
    | readonly {
        readonly amount_in_default: number | string | null;
      }[]
    | null;
}

interface TransactionPageRow extends TransactionRow {
  readonly recurring_transactions:
    | { readonly name: string }
    | readonly { readonly name: string }[]
    | null;
}

interface TransactionPageResult {
  readonly rows: readonly TransactionPageRow[];
  readonly tagRows: readonly TransactionTagRow[];
  readonly total: number;
  readonly page: number;
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
  readonly walletId: string;
  readonly placeId?: string | null;
  readonly allowanceConnectionId?: string | null;
}

export interface CreateTransactionBatchItem
  extends Omit<CreateTransactionPayload, 'quantity'> {
  readonly importContext?: TransactionImportContext;
}

export interface CreateTransactionBatchPayload {
  readonly transactions: readonly CreateTransactionBatchItem[];
}

export type UpdateTransactionPayload = Omit<
  CreateTransactionPayload,
  'quantity'
>;

interface NormalizedCreatePayload {
  readonly categoryId: string;
  readonly description: string | null;
  readonly occurredAt: Date;
  readonly amount: number;
  readonly amountInDefault: number;
  readonly currency: string;
  readonly direction: TransactionDirection;
  readonly quantity: number;
  readonly tagIds: readonly string[];
  readonly exchangeRate: number | null;
  readonly walletId: string;
  readonly placeId: string | null;
  readonly allowanceConnectionId: string | null;
}

interface NormalizedUpdatePayload {
  readonly categoryId: string;
  readonly description: string | null;
  readonly occurredAt: Date;
  readonly amount: number;
  readonly amountInDefault: number;
  readonly currency: string;
  readonly direction: TransactionDirection;
  readonly tagIds: readonly string[];
  readonly exchangeRate: number | null;
  readonly walletId: string;
  readonly placeId: string | null;
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
    transactionPage: FIRST_TRANSACTION_PAGE,
    totalMatchingTransactions: 0,
    hasMoreTransactions: false,
    loadingMoreTransactions: false,
    tags: [],
    wallets: [],
    places: [],
    currencies: [],
    defaultCurrency: null,
    availableYears: [],
    transactionTags: new Map(),
    categorySummaries: new Map(),
    groupSummaries: new Map(),
    tagSummaries: new Map(),
    summaryLoading: false,
    summaryError: null,
    allowanceConnections: [],
  });

  private readonly filters = signal<TransactionsFilters>(
    this.createInitialFilters()
  );
  private readonly filtersInitialized = signal(false);
  private categorySummaryRequestToken = 0;
  private transactionRequestToken = 0;
  private lastSummaryRangeKey: string | null = null;
  private readonly categorySummaryEffect = effect(() => {
    this.scheduleCategorySummaryRefresh();
  });

  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly mutationError = computed(() => this.state().mutationError);
  readonly transactionMutationPending = computed(
    () => this.state().transactionMutationPending
  );
  readonly categories = computed(() => this.state().categories);
  readonly groups = computed(() => this.state().groups);
  readonly transactions = computed(() => this.state().transactions);
  readonly loadedTransactionCount = computed(
    () => this.state().transactions.length
  );
  readonly totalMatchingTransactions = computed(
    () => this.state().totalMatchingTransactions
  );
  readonly hasMoreTransactions = computed(
    () => this.state().hasMoreTransactions
  );
  readonly loadingMoreTransactions = computed(
    () => this.state().loadingMoreTransactions
  );
  readonly tags = computed(() => this.state().tags);
  readonly wallets = computed(() => this.state().wallets);
  readonly places = computed(() => this.state().places);
  readonly currencies = computed(() => this.state().currencies);
  readonly allowanceConnections = computed(
    () => this.state().allowanceConnections
  );
  readonly defaultCurrency = computed(
    () => this.state().defaultCurrency ?? FALLBACK_CURRENCY
  );
  readonly defaultWalletId = computed(() => {
    const wallets = this.state().wallets;
    const preferred = wallets.find((wallet) => wallet.isDefault);
    return preferred?.id ?? wallets[0]?.id ?? null;
  });
  readonly categorySummaryLoading = computed(() => this.state().summaryLoading);
  readonly categorySummaryError = computed(() => this.state().summaryError);
  private readonly totalExpenseAmountSignal = computed(() => {
    let total = 0;
    for (const summary of this.state().categorySummaries.values()) {
      total += summary.totalAmount;
    }
    return total;
  });
  readonly activeFilters = computed(() => {
    const filters = this.filters();
    return {
      ...filters,
      from: filters.from ? new Date(filters.from) : null,
      to: filters.to ? new Date(filters.to) : null,
      selectedCategoryIds: [...filters.selectedCategoryIds],
      selectedTagIds: [...filters.selectedTagIds],
    };
  });

  readonly hasActiveCategoryFilter = computed(
    () => this.filters().selectedCategoryIds.length > 0
  );
  readonly hasActiveTagFilter = computed(
    () => this.filters().selectedTagIds.length > 0
  );
  readonly selectedCategoryFilterValue = computed(() => {
    const selectedIds = this.filters().selectedCategoryIds;
    if (selectedIds.length === 0) {
      return '';
    }

    for (const group of this.state().groups) {
      const groupIds = this.categoryIdsForGroup(group.id);
      if (this.hasExactlySelectedCategoryIds(selectedIds, groupIds)) {
        return `group:${group.id}`;
      }
    }

    for (const category of this.state().categories) {
      const categoryIds = this.categoryIdsWithDescendants(category.id);
      if (this.hasExactlySelectedCategoryIds(selectedIds, categoryIds)) {
        return `category:${category.id}`;
      }
    }

    return 'mixed';
  });
  readonly visibleTagSummaries = computed<readonly TagExpenseSummary[]>(() =>
    [...this.state().tagSummaries.values()].filter(
      (tag) => tag.transactionCount > 0 && Math.abs(tag.totalAmount) > 0
    )
  );
  readonly groupedCategories = computed<readonly GroupWithCategories[]>(() => {
    const groups = this.state().groups;
    const categories = this.state().categories;

    return groups
      .map((group) => ({
        ...group,
        categories: categories.filter(
          (category) => category.groupId === group.id
        ),
      }))
      .filter((group) => group.categories.length > 0);
  });

  readonly ungroupedCategories = computed(() =>
    this.state()
      .categories.filter((category) => !category.groupId)
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  readonly transactionsView = computed<readonly TransactionViewModel[]>(() => {
    const state = this.state();
    const categoriesById = new Map(
      state.categories.map((category) => [category.id, category])
    );
    const groupsById = new Map(state.groups.map((group) => [group.id, group]));
    const placesById = new Map(state.places.map((place) => [place.id, place]));
    const tagsMap = state.transactionTags;

    return state.transactions.map((transaction) => {
      const category = categoriesById.get(transaction.categoryId) ?? null;
      const group = category?.groupId
        ? groupsById.get(category.groupId) ?? null
        : null;
      return {
        ...transaction,
        category,
        group,
        tagIds: tagsMap.get(transaction.id) ?? [],
        place: transaction.placeId
          ? placesById.get(transaction.placeId) ?? null
          : null,
      };
    });
  });

  readonly filteredTransactions = computed(() => this.transactionsView());

  readonly availableYears = computed(() => {
    const years = this.state().availableYears;
    return years.length > 0 ? years : [new Date().getFullYear()];
  });

  constructor() {
    effect(() => {
      if (!this.filtersInitialized()) {
        return;
      }
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
          transactionPage: FIRST_TRANSACTION_PAGE,
          totalMatchingTransactions: 0,
          hasMoreTransactions: false,
          loadingMoreTransactions: false,
          tags: [],
          wallets: [],
          places: [],
          currencies: [],
          defaultCurrency: null,
          availableYears: [],
          transactionTags: new Map(),
          categorySummaries: new Map(),
          groupSummaries: new Map(),
          tagSummaries: new Map(),
          summaryLoading: false,
          summaryError: null,
          allowanceConnections: [],
        });
        this.filters.set(this.createInitialFilters());
        this.lastSummaryRangeKey = null;
        return;
      }

      const currentUserId = session.user.id;
      if (this.userId() === currentUserId) {
        return;
      }

      this.userId.set(currentUserId);
      void this.refresh();
    });
  }

  tagIdsForTransaction(transactionId: string): readonly string[] {
    return this.state().transactionTags.get(transactionId) ?? [];
  }

  categoryExpenseTotal(categoryId: string): number {
    return this.state().categorySummaries.get(categoryId)?.totalAmount ?? 0;
  }

  categoryTransactionCount(categoryId: string): number {
    return (
      this.state().categorySummaries.get(categoryId)?.transactionCount ?? 0
    );
  }

  groupExpenseTotal(groupId: string | null): number {
    return this.state().groupSummaries.get(groupId)?.totalAmount ?? 0;
  }

  groupTransactionCount(groupId: string | null): number {
    return this.state().groupSummaries.get(groupId)?.transactionCount ?? 0;
  }

  tagExpenseTotal(tagId: string): number {
    return this.state().tagSummaries.get(tagId)?.totalAmount ?? 0;
  }

  tagTransactionCount(tagId: string): number {
    return this.state().tagSummaries.get(tagId)?.transactionCount ?? 0;
  }

  overallExpenseTotal(): number {
    return this.totalExpenseAmountSignal();
  }

  getTransactionForEdit(transactionId: string): TransactionViewModel | null {
    return (
      this.transactionsView().find(
        (transaction) => transaction.id === transactionId
      ) ?? null
    );
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
        tagsResult,
        walletsResult,
        placesResult,
        currenciesResult,
        availableYears,
        allowanceConnectionsResult,
      ] = await Promise.all([
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
          .from('wallets')
          .select('*')
          .eq('owner_id', userId)
          .order('name', { ascending: true }),
        this.supabase
          .from('places')
          .select('*')
          .eq('owner_id', userId)
          .order('name', { ascending: true }),
        this.supabase
          .from('currencies')
          .select('*')
          .order('symbol', { ascending: true }),
        this.loadAvailableYears(userId),
        this.supabase.rpc('get_allowance_connections'),
      ]);

      if (groupsResult.error) {
        throw groupsResult.error;
      }

      if (categoriesResult.error) {
        throw categoriesResult.error;
      }

      if (tagsResult.error) {
        throw tagsResult.error;
      }

      if (walletsResult.error) {
        throw walletsResult.error;
      }

      if (placesResult.error) {
        throw placesResult.error;
      }

      if (currenciesResult.error) {
        throw currenciesResult.error;
      }
      if (allowanceConnectionsResult.error) {
        throw allowanceConnectionsResult.error;
      }

      const groups = this.sortGroups(
        (groupsResult.data ?? []).map((group) =>
          this.mapGroupRow(group as CategoryGroupRow)
        )
      );
      const categories = this.sortCategories(
        (categoriesResult.data ?? []).map((category) =>
          this.mapCategoryRow(category as CategoryRow)
        )
      );
      const tags = this.sortTags(
        (tagsResult.data ?? []).map((tag) => this.mapTagRow(tag as TagRow))
      );
      const places = this.sortPlaces(
        (placesResult.data ?? []).map((place) =>
          this.mapPlaceRow(place as PlaceRow)
        )
      );
      const currencyRows = (currenciesResult.data ?? []).map((row) =>
        this.mapCurrencyRow(row as CurrencyRow)
      );
      const currencyLookup = new Map(
        currencyRows.map((currency) => [currency.id, currency.symbol])
      );
      const currencies = this.sortCurrencies(currencyRows);
      const wallets = this.sortWallets(
        (walletsResult.data ?? []).map((wallet) =>
          this.mapWalletRow(wallet as WalletRow, currencyLookup)
        )
      );
      const defaultCurrency =
        wallets.find((wallet) => wallet.isDefault)?.currency ??
        wallets[0]?.currency ??
        FALLBACK_CURRENCY;
      const previousState = this.state();
      const allowanceConnections = (
        (allowanceConnectionsResult.data ?? []) as AllowanceConnectionRpcRow[]
      )
        .filter(
          (row) => row.role === 'payer' && row.status === 'active' && row.id
        )
        .map((row) => ({
          id: row.id as string,
          counterpartName: row.counterpart_name ?? '',
        }));
      this.state.set({
        loading: true,
        error: null,
        mutationError: this.state().mutationError,
        transactionMutationPending: false,
        categories,
        groups,
        transactions: [],
        transactionPage: FIRST_TRANSACTION_PAGE,
        totalMatchingTransactions: 0,
        hasMoreTransactions: false,
        loadingMoreTransactions: false,
        tags,
        wallets,
        places,
        currencies,
        defaultCurrency,
        availableYears,
        transactionTags: new Map(),
        categorySummaries: previousState.categorySummaries,
        groupSummaries: previousState.groupSummaries,
        tagSummaries: previousState.tagSummaries,
        summaryLoading: previousState.summaryLoading,
        summaryError: previousState.summaryError,
        allowanceConnections,
      });
      await this.loadTransactionsPage({
        append: false,
        showInitialLoading: false,
      });
      this.scheduleCategorySummaryRefresh(true);
    } catch (error) {
      const message = this.describeError(error);
      logError('TransactionsStore', 'Failed to load transactions', error);
      this.state.update((state) => ({
        ...state,
        loading: false,
        error: message,
        transactionMutationPending: false,
      }));
    }
  }

  async loadMoreTransactions(): Promise<void> {
    const state = this.state();
    if (
      state.loading ||
      state.loadingMoreTransactions ||
      !state.hasMoreTransactions
    ) {
      return;
    }

    await this.loadTransactionsPage({
      append: true,
      showInitialLoading: false,
    });
  }

  private async reloadTransactionsAfterFilterChange(): Promise<void> {
    if (!this.userId()) {
      return;
    }

    await this.loadTransactionsPage({
      append: false,
      showInitialLoading: true,
    });
  }

  private async loadTransactionsPage(options: {
    append: boolean;
    showInitialLoading: boolean;
  }): Promise<void> {
    const userId = this.userId();
    if (!userId) {
      return;
    }

    const page = options.append
      ? this.state().transactionPage + 1
      : FIRST_TRANSACTION_PAGE;
    const requestToken = ++this.transactionRequestToken;

    this.state.update((state) => ({
      ...state,
      loading: options.showInitialLoading ? true : state.loading,
      loadingMoreTransactions: options.append,
      error: null,
      ...(options.append
        ? {}
        : {
            transactions: [],
            transactionTags: new Map<string, readonly string[]>(),
            transactionPage: FIRST_TRANSACTION_PAGE,
            totalMatchingTransactions: 0,
            hasMoreTransactions: false,
          }),
    }));

    try {
      const result = await this.fetchTransactionPage(
        userId,
        this.filters(),
        page
      );
      if (requestToken !== this.transactionRequestToken) {
        return;
      }

      const transactions = result.rows.map((row) =>
        this.mapTransactionRow(row)
      );
      const pageTags = this.buildTransactionTagsMap(result.tagRows);
      const nextTransactionTags = options.append
        ? new Map(this.state().transactionTags)
        : new Map<string, readonly string[]>();
      for (const [transactionId, tagIds] of pageTags.entries()) {
        nextTransactionTags.set(transactionId, tagIds);
      }

      const loadedRows = options.append
        ? this.state().transactions.length + transactions.length
        : transactions.length;
      this.state.update((state) => ({
        ...state,
        loading: false,
        loadingMoreTransactions: false,
        transactions: options.append
          ? [...state.transactions, ...transactions]
          : transactions,
        transactionTags: nextTransactionTags,
        transactionPage: result.page,
        totalMatchingTransactions: result.total,
        hasMoreTransactions: loadedRows < result.total,
      }));
    } catch (error) {
      if (requestToken !== this.transactionRequestToken) {
        return;
      }

      const message = this.describeError(error);
      logError('TransactionsStore', 'Failed to load transaction page', error);
      this.state.update((state) => ({
        ...state,
        loading: false,
        loadingMoreTransactions: false,
        error: message,
      }));
    }
  }

  private async fetchTransactionPage(
    userId: string,
    filters: TransactionsFilters,
    page: number
  ): Promise<TransactionPageResult> {
    const from = page * SUPABASE_PAGE_SIZE;
    const to = from + SUPABASE_PAGE_SIZE - 1;
    let query = this.supabase
      .from('transactions')
      .select('*, recurring_transactions(name)', { count: 'exact' })
      .eq('owner_id', userId);

    if (filters.from) {
      query = query.gte(
        'occurred_at',
        this.startOfDay(filters.from).toISOString()
      );
    }

    if (filters.to) {
      query = query.lte('occurred_at', this.endOfDay(filters.to).toISOString());
    }

    if (filters.selectedCategoryIds.length > 0) {
      query = query.in('category_id', [...filters.selectedCategoryIds]);
    }

    if (filters.selectedPlaceId) {
      query = query.eq('place_id', filters.selectedPlaceId);
    }

    if (filters.minimumAmount !== null) {
      query = query.gte('amount_in_default', filters.minimumAmount);
    }

    if (filters.maximumAmount !== null) {
      query = query.lte('amount_in_default', filters.maximumAmount);
    }

    if (filters.selectedTagIds.length > 0) {
      const transactionIds = await this.loadTransactionIdsForTags(
        userId,
        filters.selectedTagIds
      );
      if (transactionIds.length === 0) {
        return {
          rows: [],
          tagRows: [],
          total: 0,
          page,
        };
      }

      query = query.in('id', [...transactionIds]);
    }

    const searchFilter = this.buildTransactionSearchFilter(filters.searchTerm);
    if (searchFilter) {
      query = query.or(searchFilter);
    }

    switch (filters.sort) {
      case 'dateAsc':
        query = query.order('occurred_at', { ascending: true });
        break;
      case 'amountDesc':
        query = query
          .order('amount_in_default', { ascending: false })
          .order('occurred_at', { ascending: false });
        break;
      case 'amountAsc':
        query = query
          .order('amount_in_default', { ascending: true })
          .order('occurred_at', { ascending: false });
        break;
      case 'descriptionAsc':
        query = query
          .order('description', { ascending: true, nullsFirst: false })
          .order('occurred_at', { ascending: false });
        break;
      case 'descriptionDesc':
        query = query
          .order('description', { ascending: false, nullsFirst: false })
          .order('occurred_at', { ascending: false });
        break;
      case 'dateDesc':
      default:
        query = query.order('occurred_at', { ascending: false });
        break;
    }

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) {
      throw error;
    }

    const rows = (data ?? []) as TransactionPageRow[];
    const tagRows = await this.loadTransactionTagRows(
      userId,
      rows.map((row) => row.id)
    );
    return {
      rows,
      tagRows,
      total: count ?? rows.length,
      page,
    };
  }

  private async loadTransactionIdsForTags(
    userId: string,
    tagIds: readonly string[]
  ): Promise<readonly string[]> {
    const { data, error } = await this.supabase
      .from('transaction_tags')
      .select('transaction_id')
      .eq('owner_id', userId)
      .in('tag_id', [...tagIds]);

    if (error) {
      throw error;
    }

    return Array.from(new Set((data ?? []).map((row) => row.transaction_id)));
  }

  private async loadTransactionTagRows(
    userId: string,
    transactionIds: readonly string[]
  ): Promise<TransactionTagRow[]> {
    if (transactionIds.length === 0) {
      return [];
    }

    const rows: TransactionTagRow[] = [];
    for (
      let index = 0;
      index < transactionIds.length;
      index += TRANSACTION_TAG_QUERY_BATCH_SIZE
    ) {
      const batch = transactionIds.slice(
        index,
        index + TRANSACTION_TAG_QUERY_BATCH_SIZE
      );
      const { data, error } = await this.supabase
        .from('transaction_tags')
        .select('*')
        .eq('owner_id', userId)
        .in('transaction_id', [...batch]);

      if (error) {
        throw error;
      }

      rows.push(...((data ?? []) as TransactionTagRow[]));
    }

    return rows;
  }

  private async loadAvailableYears(userId: string): Promise<readonly number[]> {
    const [oldestResult, newestResult] = await Promise.all([
      this.supabase
        .from('transactions')
        .select('occurred_at')
        .eq('owner_id', userId)
        .order('occurred_at', { ascending: true })
        .limit(1),
      this.supabase
        .from('transactions')
        .select('occurred_at')
        .eq('owner_id', userId)
        .order('occurred_at', { ascending: false })
        .limit(1),
    ]);

    if (oldestResult.error) {
      throw oldestResult.error;
    }

    if (newestResult.error) {
      throw newestResult.error;
    }

    const oldest = oldestResult.data?.[0]?.occurred_at;
    const newest = newestResult.data?.[0]?.occurred_at;
    if (!oldest || !newest) {
      return [new Date().getFullYear()];
    }

    const firstYear = new Date(oldest).getUTCFullYear();
    const lastYear = new Date(newest).getUTCFullYear();
    const years: number[] = [];
    for (let year = lastYear; year >= firstYear; year -= 1) {
      years.push(year);
    }

    return years;
  }

  private buildTransactionSearchFilter(searchTerm: string): string | null {
    const normalized = searchTerm
      .trim()
      .replace(/[%,()]/g, ' ')
      .replace(/\s+/g, ' ');
    if (!normalized) {
      return null;
    }

    const matchingCategoryIds = this.matchingCategoryIdsForSearch(normalized);
    const filters = [
      `description.ilike.%${normalized}%`,
      `currency.ilike.%${normalized}%`,
    ];
    if (matchingCategoryIds.length > 0) {
      filters.push(`category_id.in.(${matchingCategoryIds.join(',')})`);
    }

    const matchingPlaceIds = this.matchingPlaceIdsForSearch(normalized);
    if (matchingPlaceIds.length > 0) {
      filters.push(`place_id.in.(${matchingPlaceIds.join(',')})`);
    }

    return filters.join(',');
  }

  private matchingCategoryIdsForSearch(searchTerm: string): readonly string[] {
    const normalized = searchTerm.toLowerCase();
    const groups = this.state().groups;
    const categories = this.state().categories;
    const matchingGroupIds = new Set(
      groups
        .filter((group) => group.name.toLowerCase().includes(normalized))
        .map((group) => group.id)
    );

    return categories
      .filter(
        (category) =>
          category.name.toLowerCase().includes(normalized) ||
          (category.groupId ? matchingGroupIds.has(category.groupId) : false)
      )
      .map((category) => category.id);
  }

  private matchingPlaceIdsForSearch(searchTerm: string): readonly string[] {
    const normalized = searchTerm.toLowerCase();
    return this.state()
      .places.filter((place) =>
        [
          place.name,
          place.street,
          place.city,
          place.postalCode,
          place.country,
          place.note,
        ]
          .filter((value): value is string => !!value)
          .some((value) => value.toLowerCase().includes(normalized))
      )
      .map((place) => place.id);
  }

  applyPreset(preset: TransactionPresetId): void {
    const current = this.filters();
    if (preset === 'custom') {
      this.filters.set({
        ...current,
        preset,
      });
      void this.reloadTransactionsAfterFilterChange();
      return;
    }

    const { from, to } = this.resolvePresetRange(preset);
    this.filters.set({
      ...current,
      preset,
      from,
      to,
    });
    void this.reloadTransactionsAfterFilterChange();
  }

  setCustomDateRange(from: Date | null, to: Date | null): void {
    const sanitized = this.normalizeDateRange(from, to);
    this.filters.set({
      ...this.filters(),
      preset: 'custom',
      from: sanitized.from,
      to: sanitized.to,
    });
    void this.reloadTransactionsAfterFilterChange();
  }

  setSearchTerm(term: string): void {
    this.filters.update((filters) => ({
      ...filters,
      searchTerm: term,
    }));
    void this.reloadTransactionsAfterFilterChange();
  }

  setPlaceFilter(placeId: string | null): void {
    this.filters.update((filters) => ({
      ...filters,
      selectedPlaceId: placeId || null,
    }));
    void this.reloadTransactionsAfterFilterChange();
  }

  setAmountRange(
    minimumAmount: number | null,
    maximumAmount: number | null
  ): void {
    this.filters.update((filters) => ({
      ...filters,
      minimumAmount: this.normalizeFilterAmount(minimumAmount),
      maximumAmount: this.normalizeFilterAmount(maximumAmount),
    }));
    void this.reloadTransactionsAfterFilterChange();
  }

  setSort(sort: TransactionSortId): void {
    this.filters.update((filters) => ({
      ...filters,
      sort,
    }));
    void this.reloadTransactionsAfterFilterChange();
  }

  setCategorySelection(categoryId: string | null): void {
    this.filters.update((filters) => ({
      ...filters,
      selectedCategoryIds: categoryId
        ? this.categoryIdsWithDescendants(categoryId)
        : [],
    }));
    void this.reloadTransactionsAfterFilterChange();
  }

  setCategoryGroupSelection(groupId: string | null): void {
    this.filters.update((filters) => ({
      ...filters,
      selectedCategoryIds: this.categoryIdsForGroup(groupId),
    }));
    void this.reloadTransactionsAfterFilterChange();
  }

  toggleCategorySelection(categoryId: string): void {
    this.filters.update((filters) => {
      const set = new Set(filters.selectedCategoryIds);
      const categoryIds = this.categoryIdsWithDescendants(categoryId);
      const allSelected = categoryIds.every((id) => set.has(id));
      if (allSelected) {
        categoryIds.forEach((id) => set.delete(id));
      } else {
        categoryIds.forEach((id) => set.add(id));
      }

      return {
        ...filters,
        selectedCategoryIds: Array.from(set),
      };
    });
    void this.reloadTransactionsAfterFilterChange();
  }

  toggleCategoryGroupSelection(groupId: string | null): void {
    this.filters.update((filters) => {
      const set = new Set(filters.selectedCategoryIds);
      const groupIds = this.categoryIdsForGroup(groupId);
      const allSelected = groupIds.every((id) => set.has(id));
      if (allSelected) {
        groupIds.forEach((id) => set.delete(id));
      } else {
        groupIds.forEach((id) => set.add(id));
      }

      return {
        ...filters,
        selectedCategoryIds: Array.from(set),
      };
    });
    void this.reloadTransactionsAfterFilterChange();
  }

  isCategoryGroupSelected(groupId: string | null): boolean {
    const selectedIds = new Set(this.filters().selectedCategoryIds);
    const groupIds = this.categoryIdsForGroup(groupId);
    return groupIds.length > 0 && groupIds.every((id) => selectedIds.has(id));
  }

  isCategoryGroupIndeterminate(groupId: string | null): boolean {
    const selectedIds = new Set(this.filters().selectedCategoryIds);
    const groupIds = this.categoryIdsForGroup(groupId);
    const selectedCount = groupIds.filter((id) => selectedIds.has(id)).length;
    return selectedCount > 0 && selectedCount < groupIds.length;
  }

  toggleTagSelection(tagId: string): void {
    this.filters.update((filters) => {
      const set = new Set(filters.selectedTagIds);
      if (set.has(tagId)) {
        set.delete(tagId);
      } else {
        set.add(tagId);
      }

      return {
        ...filters,
        selectedTagIds: Array.from(set),
      };
    });
    void this.reloadTransactionsAfterFilterChange();
  }

  clearCategorySelection(): void {
    this.filters.update((filters) => ({
      ...filters,
      selectedCategoryIds: [],
    }));
    void this.reloadTransactionsAfterFilterChange();
  }

  clearTagSelection(): void {
    this.filters.update((filters) => ({
      ...filters,
      selectedTagIds: [],
    }));
    void this.reloadTransactionsAfterFilterChange();
  }

  setSelectedMonth(year: number, monthIndex: number): void {
    const range = this.monthRange(year, monthIndex);
    this.filters.update((filters) => ({
      ...filters,
      preset: 'custom',
      from: range.from,
      to: range.to,
    }));
    void this.reloadTransactionsAfterFilterChange();
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
    void this.reloadTransactionsAfterFilterChange();
  }

  resetFilters(): void {
    this.filters.set(this.createInitialFilters());
    void this.reloadTransactionsAfterFilterChange();
  }

  applyFilters(filters: TransactionsFilters): void {
    if (this.filtersEqual(this.filters(), filters)) {
      return;
    }
    this.setFiltersFromExternalState(filters);
    void this.reloadTransactionsAfterFilterChange();
  }

  initializeFilters(filters: TransactionsFilters): boolean {
    if (this.filtersInitialized()) {
      return false;
    }
    this.setFiltersFromExternalState(filters);
    this.filtersInitialized.set(true);
    return true;
  }

  private setFiltersFromExternalState(filters: TransactionsFilters): void {
    this.filters.set({
      ...filters,
      selectedCategoryIds: [...filters.selectedCategoryIds],
      selectedTagIds: [...filters.selectedTagIds],
      from: filters.from ? new Date(filters.from) : null,
      to: filters.to ? new Date(filters.to) : null,
    });
  }

  private filtersEqual(
    left: TransactionsFilters,
    right: TransactionsFilters
  ): boolean {
    const normalizeIds = (values: readonly string[]) =>
      [...new Set(values)].sort().join('\u0000');
    return (
      normalizeIds(left.selectedCategoryIds) ===
        normalizeIds(right.selectedCategoryIds) &&
      normalizeIds(left.selectedTagIds) === normalizeIds(right.selectedTagIds) &&
      left.selectedPlaceId === right.selectedPlaceId &&
      left.minimumAmount === right.minimumAmount &&
      left.maximumAmount === right.maximumAmount &&
      left.searchTerm === right.searchTerm &&
      left.from?.getTime() === right.from?.getTime() &&
      left.to?.getTime() === right.to?.getTime() &&
      left.preset === right.preset &&
      left.sort === right.sort
    );
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
          .filter((name): name is string => !!name)
      )
    );

    if (sanitized.length === 0) {
      return [];
    }

    const currentState = this.state();
    const existingByName = new Map(
      currentState.tags.map((tag) => [tag.name.toLowerCase(), tag])
    );
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
          }))
        )
        .select('*');

      if (error) {
        throw error;
      }

      const createdTags = (data ?? []).map((row) =>
        this.mapTagRow(row as TagRow)
      );
      result.push(...createdTags);

      this.state.update((state) => ({
        ...state,
        tags: this.sortTags([...state.tags, ...createdTags]),
      }));
    }

    const lookup = new Map(
      this.state().tags.map((tag) => [tag.name.toLowerCase(), tag])
    );
    return sanitized
      .map((name) => lookup.get(name.toLowerCase()))
      .filter((tag): tag is TagEntity => !!tag);
  }

  async getExchangeRate(
    sourceCurrency: string,
    targetCurrency: string,
    rateDate: Date
  ): Promise<number | null> {
    const source = this.normalizeCurrency(sourceCurrency);
    const target = this.normalizeCurrency(targetCurrency);
    if (!source || !target || Number.isNaN(rateDate.getTime())) {
      return null;
    }

    if (source === target) {
      return 1;
    }

    const { data, error } = await this.supabase.rpc('get_exchange_rate', {
      p_source_currency: source,
      p_target_currency: target,
      p_rate_date: this.toDateOnly(rateDate),
    });

    if (error) {
      throw error;
    }

    const rate =
      typeof data === 'number' ? data : data != null ? Number(data) : null;
    return Number.isFinite(rate ?? NaN) && (rate as number) > 0
      ? (rate as number)
      : null;
  }

  async createTransactions(
    payload: CreateTransactionPayload
  ): Promise<{ success: boolean; error?: string }> {
    const userId = this.userId();
    if (!userId) {
      const message = 'You need to be signed in to create transactions.';
      return { success: false, error: message };
    }

    const normalized = this.normalizeCreatePayload(payload);
    if (!normalized) {
      const message =
        'Invalid transaction data. Please review the form and try again.';
      return { success: false, error: message };
    }

    this.state.update((state) => ({
      ...state,
      transactionMutationPending: true,
      mutationError: null,
    }));

    try {
      if (normalized.allowanceConnectionId) {
        const { error } = await this.supabase.rpc(
          'create_allowance_transaction',
          {
            p_connection_id: normalized.allowanceConnectionId,
            p_category_id: normalized.categoryId,
            p_wallet_id: normalized.walletId,
            p_occurred_at: normalized.occurredAt.toISOString(),
            p_description: normalized.description,
            p_amount: normalized.amount,
            p_currency: normalized.currency,
            p_place_id: normalized.placeId,
            p_tag_ids: [...normalized.tagIds],
          }
        );
        if (error) throw error;
        await this.refresh();
        this.state.update((state) => ({
          ...state,
          transactionMutationPending: false,
          mutationError: null,
        }));
        return { success: true };
      }

      const rows = Array.from({ length: normalized.quantity }, () => ({
        owner_id: userId,
        category_id: normalized.categoryId,
        description: normalized.description,
        occurred_at: normalized.occurredAt.toISOString(),
        amount: normalized.amount,
        amount_in_default: normalized.amountInDefault,
        currency: normalized.currency,
        direction: normalized.direction,
        is_automatic: false,
        exchange_rate: normalized.exchangeRate,
        wallet_id: normalized.walletId,
        place_id: normalized.placeId,
      }));

      const { data: inserted, error } = await this.supabase
        .from('transactions')
        .insert(rows)
        .select('id');
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
          }))
        );

        const { error: tagError } = await this.supabase
          .from('transaction_tags')
          .insert(tagRows);
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
      logError('TransactionsStore', 'Failed to create transaction', error);
      this.state.update((state) => ({
        ...state,
        transactionMutationPending: false,
        mutationError: message,
      }));
      return { success: false, error: message };
    }
  }

  async createTransactionBatch(
    payload: CreateTransactionBatchPayload
  ): Promise<{
    success: boolean;
    created: number;
    duplicatesSkipped: number;
    error?: string;
  }> {
    const userId = this.userId();
    if (!userId) {
      const message = 'You need to be signed in to create transactions.';
      return {
        success: false,
        created: 0,
        duplicatesSkipped: 0,
        error: message,
      };
    }

    this.state.update((state) => ({
      ...state,
      transactionMutationPending: true,
      mutationError: null,
    }));

    try {
      const existingKeys = await this.loadExistingImportKeys(
        payload.transactions
      );
      const seenImportKeys = new Set(existingKeys);
      const transactions = payload.transactions.filter((transaction) => {
        const context = transaction.importContext;
        if (!context) return true;
        const key = `${context.source}|${context.fingerprint}`;
        if (seenImportKeys.has(key)) return false;
        seenImportKeys.add(key);
        return true;
      });
      const duplicatesSkipped =
        payload.transactions.length - transactions.length;
      if (transactions.length === 0) {
        this.state.update((state) => ({
          ...state,
          transactionMutationPending: false,
          mutationError: null,
        }));
        return { success: true, created: 0, duplicatesSkipped };
      }

      const normalized = transactions
        .map((transaction) =>
          this.normalizeCreatePayload({ ...transaction, quantity: 1 })
        )
        .filter((transaction): transaction is NormalizedCreatePayload =>
          Boolean(transaction)
        );
      if (normalized.length !== transactions.length) {
        throw new Error(
          'Invalid transaction data. Please review the form and try again.'
        );
      }

      const importedAt = new Date().toISOString();
      const rows = normalized.map((transaction, index) => ({
        ...(() => {
          const context = transactions[index].importContext;
          return context
            ? {
                import_source: context.source,
                import_fingerprint: context.fingerprint,
                import_metadata: context.metadata as unknown as Json,
                imported_at: importedAt,
                recurring_scheduled_for:
                  context.isAutomatic && context.recurringScheduledFor
                    ? context.recurringScheduledFor.toISOString()
                    : null,
              }
            : {};
        })(),
        owner_id: userId,
        category_id: transaction.categoryId,
        description: transaction.description,
        occurred_at: transaction.occurredAt.toISOString(),
        amount: transaction.amount,
        amount_in_default: transaction.amountInDefault,
        currency: transaction.currency,
        direction: transaction.direction,
        is_automatic: transactions[index].importContext?.isAutomatic ?? false,
        exchange_rate: transaction.exchangeRate,
        wallet_id: transaction.walletId,
        place_id: transaction.placeId,
      }));

      const { data: inserted, error } = await this.supabase
        .from('transactions')
        .insert(rows)
        .select('id');
      if (error) {
        throw error;
      }

      const transactionRows = inserted ?? [];
      if (transactionRows.length !== normalized.length) {
        throw new Error('Transactions could not be created.');
      }

      const tagRows = transactionRows.flatMap((transaction, index) =>
        normalized[index].tagIds.map((tagId) => ({
          owner_id: userId,
          transaction_id: transaction.id,
          tag_id: tagId,
        }))
      );

      if (tagRows.length > 0) {
        const { error: tagError } = await this.supabase
          .from('transaction_tags')
          .insert(tagRows);
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

      return {
        success: true,
        created: transactionRows.length,
        duplicatesSkipped,
      };
    } catch (error) {
      const message = this.describeError(error);
      logError(
        'TransactionsStore',
        'Failed to create transaction batch',
        error
      );
      this.state.update((state) => ({
        ...state,
        transactionMutationPending: false,
        mutationError: message,
      }));
      return {
        success: false,
        created: 0,
        duplicatesSkipped: 0,
        error: message,
      };
    }
  }

  private async loadExistingImportKeys(
    transactions: readonly CreateTransactionBatchItem[]
  ): Promise<Set<string>> {
    const bySource = new Map<string, Set<string>>();
    for (const transaction of transactions) {
      const context = transaction.importContext;
      if (!context) continue;
      const fingerprints = bySource.get(context.source) ?? new Set<string>();
      fingerprints.add(context.fingerprint);
      bySource.set(context.source, fingerprints);
    }
    const result = new Set<string>();
    for (const [source, fingerprints] of bySource) {
      const { data, error } = await this.supabase.rpc(
        'find_existing_transaction_import_fingerprints',
        { p_import_source: source, p_import_fingerprints: [...fingerprints] }
      );
      if (error) throw error;
      for (const row of data ?? []) {
        if (row.import_fingerprint)
          result.add(`${source}|${row.import_fingerprint}`);
      }
    }
    return result;
  }

  async updateTransaction(
    transactionId: string,
    payload: UpdateTransactionPayload
  ): Promise<{ success: boolean; error?: string }> {
    const userId = this.userId();
    if (!userId) {
      const message = 'You need to be signed in to update transactions.';
      return { success: false, error: message };
    }

    const normalized = this.normalizeUpdatePayload(payload);
    if (!normalized) {
      const message =
        'Invalid transaction data. Please review the form and try again.';
      return { success: false, error: message };
    }

    this.state.update((state) => ({
      ...state,
      transactionMutationPending: true,
      mutationError: null,
    }));

    try {
      const current = this.state().transactions.find(
        (transaction) => transaction.id === transactionId
      );
      const updateResult =
        current?.sourceModule === 'allowance' &&
        current.allowanceRole === 'payer'
          ? await this.supabase.rpc('update_allowance_transaction', {
              p_transaction_id: transactionId,
              p_category_id: normalized.categoryId,
              p_wallet_id: normalized.walletId,
              p_occurred_at: normalized.occurredAt.toISOString(),
              p_description: normalized.description,
              p_amount: normalized.amount,
              p_currency: normalized.currency,
              p_place_id: normalized.placeId,
            })
          : await this.supabase
              .from('transactions')
              .update({
                category_id: normalized.categoryId,
                description: normalized.description,
                occurred_at: normalized.occurredAt.toISOString(),
                amount: normalized.amount,
                amount_in_default: normalized.amountInDefault,
                currency: normalized.currency,
                direction: normalized.direction,
                exchange_rate: normalized.exchangeRate,
                wallet_id: normalized.walletId,
                place_id: normalized.placeId,
              })
              .eq('owner_id', userId)
              .eq('id', transactionId);

      if (updateResult.error) {
        throw updateResult.error;
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
        const { error: insertTagsError } = await this.supabase
          .from('transaction_tags')
          .insert(tagRows);
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
      logError('TransactionsStore', 'Failed to update transaction', error);
      this.state.update((state) => ({
        ...state,
        transactionMutationPending: false,
        mutationError: message,
      }));
      return { success: false, error: message };
    }
  }

  async deleteTransaction(
    transactionId: string
  ): Promise<{ success: boolean; error?: string }> {
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
      const current = this.state().transactions.find(
        (transaction) => transaction.id === transactionId
      );
      const result =
        current?.sourceModule === 'allowance' &&
        current.allowanceRole === 'payer'
          ? await this.supabase.rpc('delete_allowance_transaction', {
              p_transaction_id: transactionId,
            })
          : await this.supabase
              .from('transactions')
              .delete()
              .eq('owner_id', userId)
              .eq('id', transactionId);

      if (result.error) {
        throw result.error;
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
      logError('TransactionsStore', 'Failed to delete transaction', error);
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
    const { from, to } = this.monthRange(
      now.getUTCFullYear(),
      now.getUTCMonth()
    );
    return {
      selectedCategoryIds: [],
      selectedTagIds: [],
      selectedPlaceId: null,
      minimumAmount: null,
      maximumAmount: null,
      searchTerm: '',
      preset: 'currentMonth',
      sort: 'dateDesc',
      from,
      to,
    };
  }

  private categoryIdsForGroup(groupId: string | null): readonly string[] {
    return this.state()
      .categories.filter((category) =>
        groupId ? category.groupId === groupId : !category.groupId
      )
      .map((category) => category.id);
  }

  private categoryIdsWithDescendants(categoryId: string): readonly string[] {
    const categories = this.state().categories;
    const selectedIds = new Set<string>([categoryId]);
    let foundDescendant = true;

    while (foundDescendant) {
      foundDescendant = false;
      for (const category of categories) {
        if (
          category.parentId &&
          selectedIds.has(category.parentId) &&
          !selectedIds.has(category.id)
        ) {
          selectedIds.add(category.id);
          foundDescendant = true;
        }
      }
    }

    return categories
      .filter((category) => selectedIds.has(category.id))
      .map((category) => category.id);
  }

  private hasExactlySelectedCategoryIds(
    selectedIds: readonly string[],
    expectedIds: readonly string[]
  ): boolean {
    if (selectedIds.length !== expectedIds.length || expectedIds.length === 0) {
      return false;
    }

    const selected = new Set(selectedIds);
    return expectedIds.every((id) => selected.has(id));
  }

  private normalizeFilterAmount(value: number | null): number | null {
    return value !== null && Number.isFinite(value) ? Math.max(0, value) : null;
  }

  private resolvePresetRange(preset: TransactionPresetId): {
    from: Date | null;
    to: Date | null;
  } {
    const now = new Date();
    switch (preset) {
      case 'currentMonth':
        return this.monthRange(now.getUTCFullYear(), now.getUTCMonth());
      case 'previousMonth': {
        const year =
          now.getUTCMonth() === 0
            ? now.getUTCFullYear() - 1
            : now.getUTCFullYear();
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

  private normalizeDateRange(
    from: Date | null,
    to: Date | null
  ): { from: Date | null; to: Date | null } {
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

  private monthRange(
    year: number,
    monthIndex: number
  ): { from: Date; to: Date } {
    const from = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const to = this.endOfDay(
      new Date(Date.UTC(year, monthIndex + 1, 0, 0, 0, 0, 0))
    );
    return { from, to };
  }

  private scheduleCategorySummaryRefresh(force = false): void {
    if (this.auth.loading()) {
      return;
    }

    const userId = this.userId();
    if (!userId) {
      return;
    }

    const filters = this.filters();
    const fromIso = filters.from
      ? this.startOfDay(filters.from).toISOString()
      : null;
    const toIso = filters.to ? this.endOfDay(filters.to).toISOString() : null;
    const rangeKey = `${fromIso ?? ''}|${toIso ?? ''}`;

    if (!force && this.lastSummaryRangeKey === rangeKey) {
      return;
    }

    this.lastSummaryRangeKey = rangeKey;
    void this.loadCategorySummary(fromIso, toIso);
  }

  private async loadCategorySummary(
    fromIso: string | null,
    toIso: string | null
  ): Promise<void> {
    const userId = this.userId();
    if (!userId) {
      return;
    }

    const requestToken = ++this.categorySummaryRequestToken;

    this.state.update((state) => ({
      ...state,
      summaryLoading: true,
      summaryError: null,
    }));

    try {
      const { data, error } = await this.supabase.rpc(
        'category_expense_summary',
        {
          p_from: fromIso ?? null,
          p_to: toIso ?? null,
        }
      );

      if (requestToken !== this.categorySummaryRequestToken) {
        return;
      }

      if (error) {
        throw error;
      }

      const categorySummaries = new Map<string, CategoryExpenseSummary>();
      const groupSummaries = new Map<string | null, GroupExpenseSummary>();
      const tagSummaries = await this.loadTagExpenseSummary(
        userId,
        fromIso,
        toIso
      );

      for (const row of data ?? []) {
        categorySummaries.set(
          row.category_id,
          Object.freeze({
            totalAmount: Number(row.category_total_amount ?? 0),
            transactionCount: Number(row.category_transaction_count ?? 0),
          })
        );

        const groupKey = row.group_id ?? null;
        if (!groupSummaries.has(groupKey)) {
          groupSummaries.set(
            groupKey,
            Object.freeze({
              totalAmount: Number(row.group_total_amount ?? 0),
              transactionCount: Number(row.group_transaction_count ?? 0),
            })
          );
        }
      }

      this.state.update((state) => ({
        ...state,
        categorySummaries,
        groupSummaries,
        tagSummaries,
        summaryLoading: false,
        summaryError: null,
      }));
    } catch (error) {
      if (requestToken !== this.categorySummaryRequestToken) {
        return;
      }

      const message = this.describeError(error);
      logError(
        'TransactionsStore',
        'Failed to load category expense summary',
        error
      );
      this.state.update((state) => ({
        ...state,
        summaryLoading: false,
        summaryError: message,
      }));
    }
  }

  private async loadTagExpenseSummary(
    userId: string,
    fromIso: string | null,
    toIso: string | null
  ): Promise<ReadonlyMap<string, TagExpenseSummary>> {
    let query = this.supabase
      .from('transaction_tags')
      .select(
        'tag_id, tags!inner(name, color, icon), transactions!inner(amount_in_default, occurred_at, direction)'
      )
      .eq('owner_id', userId)
      .eq('transactions.direction', 'expense');

    if (fromIso) {
      query = query.gte('transactions.occurred_at', fromIso);
    }

    if (toIso) {
      query = query.lte('transactions.occurred_at', toIso);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return this.buildTagExpenseSummaries(
      (data ?? []) as unknown as readonly TransactionTagExpenseSummaryRow[],
      userId
    );
  }

  private buildTagExpenseSummaries(
    rows: readonly TransactionTagExpenseSummaryRow[],
    userId: string
  ): ReadonlyMap<string, TagExpenseSummary> {
    const summaries = new Map<string, TagExpenseSummary>();

    for (const row of rows) {
      const tag = this.firstRelatedRow(row.tags);
      const transaction = this.firstRelatedRow(row.transactions);
      if (!tag || !transaction) {
        continue;
      }

      const current = summaries.get(row.tag_id);
      summaries.set(row.tag_id, {
        id: row.tag_id,
        ownerId: userId,
        name: tag.name,
        color: tag.color,
        icon: tag.icon,
        totalAmount:
          (current?.totalAmount ?? 0) +
          this.parseNumber(transaction.amount_in_default),
        transactionCount: (current?.transactionCount ?? 0) + 1,
      });
    }

    return new Map(
      [...summaries.entries()].sort(([, a], [, b]) => {
        const byAmount = b.totalAmount - a.totalAmount;
        return byAmount === 0 ? a.name.localeCompare(b.name) : byAmount;
      })
    );
  }

  private firstRelatedRow<T>(value: T | readonly T[] | null): T | null {
    if (!value) {
      return null;
    }

    if (Array.isArray(value)) {
      return (value as readonly T[])[0] ?? null;
    }

    return value as T;
  }

  private parseNumber(value: number | string | null | undefined): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private startOfDay(value: Date): Date {
    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
  }

  private toDateOnly(value: Date): string {
    const year = value.getUTCFullYear();
    const month = (value.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = value.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private endOfDay(value: Date): Date {
    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        value.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );
  }

  private sortGroups(
    groups: readonly CategoryGroupEntity[]
  ): CategoryGroupEntity[] {
    return [...groups].sort((a, b) => a.name.localeCompare(b.name));
  }

  private sortCategories(
    categories: readonly CategoryEntity[]
  ): CategoryEntity[] {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }

  private sortTags(tags: readonly TagEntity[]): TagEntity[] {
    return [...tags].sort((a, b) => a.name.localeCompare(b.name));
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

  private sortPlaces(places: readonly PlaceEntity[]): PlaceEntity[] {
    return [...places].sort((a, b) => {
      const byName = a.name.localeCompare(b.name);
      return byName === 0 ? (a.city ?? '').localeCompare(b.city ?? '') : byName;
    });
  }

  private sortCurrencies(
    currencies: readonly CurrencyOption[]
  ): CurrencyOption[] {
    return [...currencies].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  private mapTransactionRow(row: TransactionPageRow): TransactionEntity {
    const amount =
      typeof row.amount === 'number' ? row.amount : Number(row.amount);
    const amountInDefault =
      typeof row.amount_in_default === 'number'
        ? row.amount_in_default
        : row.amount_in_default != null
        ? Number(row.amount_in_default)
        : amount;
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
      amountInDefault: Number.isFinite(amountInDefault)
        ? amountInDefault
        : Number.isFinite(amount)
        ? amount
        : 0,
      currency: row.currency,
      direction: row.direction,
      isAutomatic: !!row.is_automatic,
      recurringTransactionId: row.recurring_transaction_id ?? null,
      recurringTransactionName: this.recurringTransactionName(row),
      recurringScheduledFor: row.recurring_scheduled_for
        ? new Date(row.recurring_scheduled_for)
        : null,
      createdAt: new Date(row.creation_date),
      updatedAt: new Date(row.updated_at),
      exchangeRate: Number.isFinite(exchangeRate ?? NaN)
        ? (exchangeRate as number)
        : null,
      walletId: row.wallet_id,
      placeId: row.place_id ?? null,
      sourceModule:
        row.source_module === 'allowance' ? 'allowance' : 'standard',
      allowancePairId: row.allowance_pair_id ?? null,
      allowanceRole:
        row.allowance_role === 'payer' || row.allowance_role === 'recipient'
          ? row.allowance_role
          : null,
      allowanceConnectionId: row.allowance_connection_id ?? null,
    };
  }

  private recurringTransactionName(row: TransactionPageRow): string | null {
    const relation = row.recurring_transactions;
    if (!relation) {
      return null;
    }
    return 'name' in relation ? relation.name : relation[0]?.name ?? null;
  }

  private mapPlaceRow(row: PlaceRow): PlaceEntity {
    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      street: row.street ?? null,
      city: row.city ?? null,
      postalCode: row.postal_code ?? null,
      country: row.country ?? null,
      note: row.note ?? null,
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
      parentId: row.parent_id ?? null,
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
      currency: currencyLookup.get(currencyId) ?? FALLBACK_CURRENCY,
    };
  }

  private findCurrencySymbolById(
    currencies: readonly CurrencyOption[],
    id: number | null | undefined
  ): string | null {
    if (id == null) {
      return null;
    }

    const match = currencies.find((currency) => currency.id === id);
    return match ? match.symbol : null;
  }

  private buildTransactionTagsMap(
    rows: readonly TransactionTagRow[]
  ): ReadonlyMap<string, readonly string[]> {
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const existing = map.get(row.transaction_id);
      if (existing) {
        existing.push(row.tag_id);
      } else {
        map.set(row.transaction_id, [row.tag_id]);
      }
    }
    return new Map(
      Array.from(map.entries(), ([id, tagIds]) => [
        id,
        Object.freeze(tagIds.slice()),
      ])
    );
  }

  private normalizeCurrency(
    input: string | null | undefined,
    currenciesOverride?: readonly CurrencyOption[]
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

  private isSupportedCurrency(
    symbol: string,
    currenciesOverride?: readonly CurrencyOption[]
  ): boolean {
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

  private normalizeCreatePayload(
    payload: CreateTransactionPayload
  ): NormalizedCreatePayload | null {
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    const rawQuantity = Math.floor(payload.quantity ?? 1);
    const quantity = Math.max(1, Math.min(rawQuantity, MAX_BULK_QUANTITY));

    if (!payload.categoryId) {
      return null;
    }

    if (
      !(payload.occurredAt instanceof Date) ||
      Number.isNaN(payload.occurredAt.getTime())
    ) {
      return null;
    }

    const description = payload.description?.trim() ?? '';
    const tagIds = Array.from(new Set(payload.tagIds ?? [])).filter(Boolean);
    const walletId = this.resolveWalletId(payload.walletId);
    if (!walletId) {
      return null;
    }
    const wallet = this.state().wallets.find((item) => item.id === walletId);
    if (!wallet) {
      return null;
    }
    const placeId = this.resolvePlaceId(payload.placeId);
    const walletCurrency = wallet.currency.toUpperCase();
    const currency = this.normalizeCurrency(payload.currency) ?? walletCurrency;
    const normalizedForeignAmount =
      typeof payload.foreignAmount === 'number' && payload.foreignAmount > 0
        ? payload.foreignAmount
        : null;

    let amountInDefault = normalizedForeignAmount ?? amount;
    let exchangeRate: number | null = null;

    if (currency !== walletCurrency) {
      if (normalizedForeignAmount) {
        exchangeRate = amount / normalizedForeignAmount;
      } else {
        amountInDefault = amount;
      }
    } else {
      amountInDefault = normalizedForeignAmount ?? amount;
    }

    return {
      categoryId: payload.categoryId,
      description: description || null,
      occurredAt: this.startOfDay(payload.occurredAt),
      amount,
      amountInDefault,
      currency,
      direction: payload.direction,
      quantity,
      tagIds,
      exchangeRate,
      walletId,
      placeId,
      allowanceConnectionId: payload.allowanceConnectionId?.trim() || null,
    };
  }

  private normalizeUpdatePayload(
    payload: UpdateTransactionPayload
  ): NormalizedUpdatePayload | null {
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    if (!payload.categoryId) {
      return null;
    }

    if (
      !(payload.occurredAt instanceof Date) ||
      Number.isNaN(payload.occurredAt.getTime())
    ) {
      return null;
    }

    const description = payload.description?.trim() ?? '';
    const tagIds = Array.from(new Set(payload.tagIds ?? [])).filter(Boolean);
    const walletId = this.resolveWalletId(payload.walletId);
    if (!walletId) {
      return null;
    }
    const wallet = this.state().wallets.find((item) => item.id === walletId);
    if (!wallet) {
      return null;
    }
    const placeId = this.resolvePlaceId(payload.placeId);
    const walletCurrency = wallet.currency.toUpperCase();
    const currency = this.normalizeCurrency(payload.currency) ?? walletCurrency;
    const normalizedForeignAmount =
      typeof payload.foreignAmount === 'number' && payload.foreignAmount > 0
        ? payload.foreignAmount
        : null;

    let amountInDefault = normalizedForeignAmount ?? amount;
    let exchangeRate: number | null = null;

    if (currency !== walletCurrency) {
      if (normalizedForeignAmount) {
        exchangeRate = amount / normalizedForeignAmount;
      } else {
        amountInDefault = amount;
      }
    } else {
      amountInDefault = normalizedForeignAmount ?? amount;
    }

    return {
      categoryId: payload.categoryId,
      description: description || null,
      occurredAt: this.startOfDay(payload.occurredAt),
      amount,
      amountInDefault,
      currency,
      direction: payload.direction,
      tagIds,
      exchangeRate,
      walletId,
      placeId,
    };
  }

  private resolveWalletId(candidate: string | null | undefined): string | null {
    const wallets = this.state().wallets;
    if (wallets.length === 0) {
      return null;
    }

    if (candidate) {
      const match = wallets.find((wallet) => wallet.id === candidate);
      if (match) {
        return match.id;
      }
    }

    const preferred = wallets.find((wallet) => wallet.isDefault);
    if (preferred) {
      return preferred.id;
    }

    return wallets[0]?.id ?? null;
  }

  private resolvePlaceId(candidate: string | null | undefined): string | null {
    const normalized = candidate?.trim() ?? '';
    if (!normalized) {
      return null;
    }

    return this.state().places.some((place) => place.id === normalized)
      ? normalized
      : null;
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

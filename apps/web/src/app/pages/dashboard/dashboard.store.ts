import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@spendist/data-access/supabase-types';
import { SUPABASE_CLIENT } from '../../core/supabase';
import { AuthService } from '../../core/auth.service';
import { logError } from '../../core/logger';

type MonthlyCashflowRow = Database['public']['Functions']['monthly_cashflow_summary']['Returns'][number];
type AvailableMonthRow = Database['public']['Functions']['available_transaction_months']['Returns'][number];
type MonthlyCategoryCashflowRow = Database['public']['Functions']['monthly_category_cashflow']['Returns'][number];
type MonthlyRecurringTransactionRow =
  Database['public']['Functions']['monthly_recurring_transaction_summary']['Returns'][number];
type PlaceExpenseSummaryRow = Database['public']['Functions']['place_expense_summary']['Returns'][number];
type TransactionDirection = Database['public']['Enums']['transaction_direction'];
type WalletRow = Pick<Database['public']['Tables']['wallets']['Row'], 'id' | 'name' | 'is_default'>;

export interface MonthlyStructureEntry {
  readonly id: string;
  readonly monthStart: Date;
  readonly incomeTotal: number;
  readonly expenseTotal: number;
  readonly netTotal: number;
}

interface DashboardState {
  readonly loading: boolean;
  readonly error: string | null;
  readonly structure: readonly MonthlyStructureEntry[];
}

interface MonthOption {
  readonly value: string;
  readonly date: Date;
  readonly label: string;
}

interface CategoryStructureEntry {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly color: string | null;
  readonly icon: string | null;
  readonly direction: TransactionDirection;
  readonly totalAmount: number;
  readonly transactionCount: number;
}

interface CategoryStructureState {
  readonly loading: boolean;
  readonly error: string | null;
  readonly entries: readonly CategoryStructureEntry[];
}

interface CategoryTotals {
  readonly income: number;
  readonly expense: number;
  readonly net: number;
}

interface RecurringTransactionSummaryEntry {
  readonly id: string;
  readonly monthStart: Date;
  readonly incomeTotal: number;
  readonly expenseTotal: number;
  readonly netTotal: number;
  readonly transactionCount: number;
}

interface RecurringTransactionSummaryState {
  readonly loading: boolean;
  readonly error: string | null;
  readonly entries: readonly RecurringTransactionSummaryEntry[];
}

interface PlaceExpenseSummaryEntry {
  readonly placeId: string;
  readonly placeName: string;
  readonly street: string | null;
  readonly city: string | null;
  readonly postalCode: string | null;
  readonly country: string | null;
  readonly totalAmount: number;
  readonly transactionCount: number;
  readonly latestTransactionAt: Date | null;
}

interface PlaceExpenseSummaryState {
  readonly loading: boolean;
  readonly error: string | null;
  readonly entries: readonly PlaceExpenseSummaryEntry[];
}

interface WalletOption {
  readonly id: string;
  readonly name: string;
  readonly isDefault: boolean;
}

interface WalletState {
  readonly loading: boolean;
  readonly error: string | null;
  readonly wallets: readonly WalletOption[];
}

const MONTH_LIMIT = 12;

@Injectable()
export class DashboardStore {
  private readonly supabase = inject<SupabaseClient>(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);

  private readonly userId = signal<string | null>(null);
  private readonly walletState = signal<WalletState>({
    loading: true,
    error: null,
    wallets: [],
  });
  private readonly structureState = signal<DashboardState>({
    loading: true,
    error: null,
    structure: [],
  });
  private readonly selectedWallet = signal<string | null>(null);
  private readonly monthOptionsState = signal<readonly MonthOption[]>([]);
  private readonly selectedMonth = signal<string | null>(null);
  private readonly categoryState = signal<CategoryStructureState>({
    loading: true,
    error: null,
    entries: [],
  });
  private readonly recurringState = signal<RecurringTransactionSummaryState>({
    loading: true,
    error: null,
    entries: [],
  });
  private readonly selectedRecurringMonth = signal<string | null>(null);
  private readonly placeState = signal<PlaceExpenseSummaryState>({
    loading: true,
    error: null,
    entries: [],
  });
  private readonly selectedPlaceYear = signal<number>(new Date().getFullYear());

  private structureRequestToken = 0;
  private monthOptionsRequestToken = 0;
  private categoryRequestToken = 0;
  private recurringRequestToken = 0;
  private placeRequestToken = 0;

  readonly walletsLoading = computed(() => this.walletState().loading);
  readonly walletError = computed(() => this.walletState().error);
  readonly walletOptions = computed(() => this.walletState().wallets);
  readonly selectedWalletId = computed(() => this.selectedWallet());

  readonly loading = computed(() => this.structureState().loading);
  readonly error = computed(() => this.structureState().error);
  readonly monthlyStructure = computed(() => this.structureState().structure);
  readonly empty = computed(
    () => !this.structureState().loading && !this.structureState().error && this.structureState().structure.length === 0,
  );

  readonly monthOptions = computed(() => this.monthOptionsState());
  readonly selectedMonthValue = computed(() => this.selectedMonth());

  readonly categoryLoading = computed(() => this.categoryState().loading);
  readonly categoryError = computed(() => this.categoryState().error);
  readonly categoryEmpty = computed(
    () =>
      !this.categoryState().loading &&
      !this.categoryState().error &&
      this.categoryState().entries.length === 0,
  );
  readonly incomeCategories = computed(() =>
    this.categoryState().entries.filter((entry) => entry.direction === 'income'),
  );
  readonly expenseCategories = computed(() =>
    this.categoryState().entries.filter((entry) => entry.direction === 'expense'),
  );
  readonly categoryTotals = computed<CategoryTotals>(() => {
    const incomeTotal = this.incomeCategories().reduce((acc, entry) => acc + entry.totalAmount, 0);
    const expenseTotal = this.expenseCategories().reduce((acc, entry) => acc + entry.totalAmount, 0);
    return {
      income: incomeTotal,
      expense: expenseTotal,
      net: incomeTotal - expenseTotal,
    };
  });
  readonly recurringLoading = computed(() => this.recurringState().loading);
  readonly recurringError = computed(() => this.recurringState().error);
  readonly recurringEmpty = computed(
    () =>
      !this.recurringState().loading &&
      !this.recurringState().error &&
      this.recurringState().entries.length === 0,
  );
  readonly recurringMonthOptions = computed<readonly MonthOption[]>(() =>
    this.recurringState().entries.map((entry) => ({
      value: entry.id,
      date: entry.monthStart,
      label: entry.id,
    })),
  );
  readonly selectedRecurringMonthValue = computed(() => this.selectedRecurringMonth());
  readonly selectedRecurringSummary = computed<RecurringTransactionSummaryEntry | null>(() => {
    const selection = this.selectedRecurringMonth();
    if (!selection) {
      return null;
    }

    return this.recurringState().entries.find((entry) => entry.id === selection) ?? null;
  });
  readonly placeLoading = computed(() => this.placeState().loading);
  readonly placeError = computed(() => this.placeState().error);
  readonly placeEntries = computed(() => this.placeState().entries);
  readonly placeEmpty = computed(
    () =>
      !this.placeState().loading &&
      !this.placeState().error &&
      this.placeState().entries.length === 0,
  );
  readonly selectedPlaceYearValue = computed(() => this.selectedPlaceYear());
  readonly placeYearOptions = computed(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => current - index);
  });

  constructor() {
    effect(() => {
      if (this.auth.loading()) {
        return;
      }

      const session = this.auth.session();
      const id = session?.user.id ?? null;
      this.userId.set(id);

      if (!id) {
        this.resetAllState();
        return;
      }

      void this.loadWallets();
    });

    effect(() => {
      const walletId = this.selectedWallet();
      const hasUser = !!this.userId();

      if (!hasUser) {
        return;
      }

      if (!walletId) {
        this.structureState.update((state) => ({
          ...state,
          loading: false,
          error: null,
          structure: [],
        }));
        this.monthOptionsState.set([]);
        this.selectedMonth.set(null);
        this.categoryState.set({
          loading: false,
          error: null,
          entries: [],
        });
        this.recurringState.set({
          loading: false,
          error: null,
          entries: [],
        });
        this.placeState.set({
          loading: false,
          error: null,
          entries: [],
        });
        this.selectedRecurringMonth.set(null);
        return;
      }

      this.categoryState.set({
        loading: true,
        error: null,
        entries: [],
      });
      this.monthOptionsState.set([]);
      this.selectedMonth.set(null);
      this.recurringState.set({
        loading: true,
        error: null,
        entries: [],
      });
      this.selectedRecurringMonth.set(null);
      this.placeState.set({
        loading: true,
        error: null,
        entries: [],
      });

      void this.loadMonthlyStructure(true);
      void this.loadAvailableMonths(true);
      void this.loadRecurringSummary(true);
      void this.loadPlaceSummary(true);
    });

    effect(() => {
      const walletId = this.selectedWallet();
      const year = this.selectedPlaceYear();
      const hasUser = !!this.userId();

      if (!hasUser || !walletId || !year) {
        return;
      }

      void this.loadPlaceSummary(true);
    });

    effect(() => {
      const selectedMonth = this.selectedMonth();
      const walletId = this.selectedWallet();
      const hasUser = !!this.userId();

      if (!hasUser || !walletId || !selectedMonth) {
        if (!selectedMonth) {
          this.categoryState.set({
            loading: false,
            error: null,
            entries: [],
          });
        }
        return;
      }

      void this.loadCategoryStructure(selectedMonth);
    });
  }

  refreshMonthlyStructure(): void {
    if (!this.selectedWallet()) {
      return;
    }
    void this.loadMonthlyStructure(true);
  }

  refreshCategoryStructure(): void {
    if (!this.selectedWallet()) {
      void this.loadWallets();
      return;
    }

    const selection = this.selectedMonth();
    if (!selection) {
      void this.loadAvailableMonths(true);
      return;
    }

    void this.loadCategoryStructure(selection);
  }

  refreshRecurringSummary(): void {
    if (!this.selectedWallet()) {
      void this.loadWallets();
      return;
    }

    void this.loadRecurringSummary(true);
  }

  refreshPlaceSummary(): void {
    if (!this.selectedWallet()) {
      void this.loadWallets();
      return;
    }

    void this.loadPlaceSummary(true);
  }

  selectWallet(id: string | null | undefined): void {
    const normalized = id?.trim() ?? '';
    if (!normalized) {
      this.selectedWallet.set(null);
      return;
    }

    if (this.selectedWallet() === normalized) {
      return;
    }

    const exists = this.walletState().wallets.some((wallet) => wallet.id === normalized);
    if (!exists) {
      return;
    }

    this.selectedWallet.set(normalized);
  }

  selectMonth(value: string | null | undefined): void {
    const normalized = value?.trim() ?? '';
    if (!normalized) {
      this.selectedMonth.set(null);
      return;
    }

    if (this.selectedMonth() === normalized) {
      return;
    }

    const exists = this.monthOptionsState().some((option) => option.value === normalized);
    if (!exists) {
      return;
    }

    this.selectedMonth.set(normalized);
  }

  selectRecurringMonth(value: string | null | undefined): void {
    const normalized = value?.trim() ?? '';
    if (!normalized) {
      this.selectedRecurringMonth.set(null);
      return;
    }

    if (this.selectedRecurringMonth() === normalized) {
      return;
    }

    const exists = this.recurringState().entries.some((entry) => entry.id === normalized);
    if (!exists) {
      return;
    }

    this.selectedRecurringMonth.set(normalized);
  }

  selectPlaceYear(value: string | number | null | undefined): void {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) {
      return;
    }

    if (this.selectedPlaceYear() === parsed) {
      return;
    }

    this.selectedPlaceYear.set(parsed);
  }

  private resetAllState(): void {
    this.structureRequestToken = 0;
    this.monthOptionsRequestToken = 0;
    this.categoryRequestToken = 0;
    this.recurringRequestToken = 0;
    this.placeRequestToken = 0;
    this.walletState.set({
      loading: false,
      error: null,
      wallets: [],
    });
    this.structureState.set({
      loading: false,
      error: null,
      structure: [],
    });
    this.selectedWallet.set(null);
    this.monthOptionsState.set([]);
    this.selectedMonth.set(null);
    this.categoryState.set({
      loading: false,
      error: null,
      entries: [],
    });
    this.recurringState.set({
      loading: false,
      error: null,
      entries: [],
    });
    this.selectedRecurringMonth.set(null);
    this.placeState.set({
      loading: false,
      error: null,
      entries: [],
    });
    this.selectedPlaceYear.set(new Date().getFullYear());
  }

  private async loadWallets(): Promise<void> {
    if (!this.userId()) {
      return;
    }

    this.walletState.set({
      loading: true,
      error: null,
      wallets: [],
    });

    try {
      const { data, error } = await this.supabase
        .from('wallets')
        .select('id, name, is_default')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      const wallets = (data ?? []).map((row) => this.mapWalletRow(row as WalletRow));
      this.walletState.set({
        loading: false,
        error: null,
        wallets,
      });

      const preferred = this.resolveWalletSelection(wallets);
      this.selectedWallet.set(preferred);
    } catch (error) {
      logError('DashboardStore', 'Failed to load wallets', error);
      this.walletState.set({
        loading: false,
        error: this.describeError(error),
        wallets: [],
      });
      this.selectedWallet.set(null);
    }
  }

  private async loadMonthlyStructure(force = false): Promise<void> {
    if (!this.userId()) {
      return;
    }
    const walletId = this.selectedWallet();
    if (!walletId) {
      return;
    }

    if (!force && this.structureState().loading) {
      return;
    }

    const token = ++this.structureRequestToken;
    this.structureState.update((state) => ({
      ...state,
      loading: true,
      error: null,
    }));

    try {
      const { data, error } = await this.supabase.rpc('monthly_cashflow_summary', {
        p_months: MONTH_LIMIT,
        p_wallet_id: walletId,
      });

      if (token !== this.structureRequestToken) {
        return;
      }

      if (error) {
        throw error;
      }

      const structure = (data ?? []).map((row: MonthlyCashflowRow) => this.mapStructureRow(row));
      this.structureState.set({
        loading: false,
        error: null,
        structure,
      });
    } catch (error) {
      if (token !== this.structureRequestToken) {
        return;
      }

      logError('DashboardStore', 'Failed to load monthly structure', error);
      this.structureState.update((state) => ({
        ...state,
        loading: false,
        error: this.describeError(error),
      }));
    }
  }

  private async loadAvailableMonths(force = false): Promise<void> {
    if (!this.userId()) {
      return;
    }
    const walletId = this.selectedWallet();
    if (!walletId) {
      return;
    }

    const token = ++this.monthOptionsRequestToken;

    try {
      const { data, error } = await this.supabase.rpc('available_transaction_months', {
        p_wallet_id: walletId,
      });

      if (token !== this.monthOptionsRequestToken) {
        return;
      }

      if (error) {
        throw error;
      }

      const options = (data ?? [])
        .map((row: AvailableMonthRow) => this.mapMonthRow(row))
        .sort((a: MonthOption, b: MonthOption) => b.date.getTime() - a.date.getTime());

      this.monthOptionsState.set(options);

      const currentSelection = this.selectedMonth();
      const nextSelection =
        !force &&
        currentSelection &&
        options.some((option: MonthOption) => option.value === currentSelection)
          ? currentSelection
          : this.resolveDefaultMonth(options);

      this.selectedMonth.set(nextSelection);
    } catch (error) {
      if (token !== this.monthOptionsRequestToken) {
        return;
      }

      logError('DashboardStore', 'Failed to load available months', error);
      this.monthOptionsState.set([]);
      this.selectedMonth.set(null);
      this.categoryState.set({
        loading: false,
        error: this.describeError(error),
        entries: [],
      });
    }
  }

  private async loadCategoryStructure(monthValue: string): Promise<void> {
    if (!this.userId()) {
      return;
    }
    const walletId = this.selectedWallet();
    if (!walletId) {
      return;
    }

    const token = ++this.categoryRequestToken;
    this.categoryState.set({
      loading: true,
      error: null,
      entries: [],
    });

    try {
      const { data, error } = await this.supabase.rpc('monthly_category_cashflow', {
        p_month_start: monthValue,
        p_wallet_id: walletId,
      });

      if (token !== this.categoryRequestToken) {
        return;
      }

      if (error) {
        throw error;
      }

      const entries = (data ?? []).map((row: MonthlyCategoryCashflowRow) => this.mapCategoryRow(row));
      this.categoryState.set({
        loading: false,
        error: null,
        entries,
      });
    } catch (error) {
      if (token !== this.categoryRequestToken) {
        return;
      }

      logError('DashboardStore', 'Failed to load category structure', error);
      this.categoryState.set({
        loading: false,
        error: this.describeError(error),
        entries: [],
      });
    }
  }

  private async loadRecurringSummary(force = false): Promise<void> {
    if (!this.userId()) {
      return;
    }
    const walletId = this.selectedWallet();
    if (!walletId) {
      return;
    }

    if (!force && this.recurringState().loading) {
      return;
    }

    const token = ++this.recurringRequestToken;
    this.recurringState.set({
      loading: true,
      error: null,
      entries: [],
    });

    try {
      const { data, error } = await this.supabase.rpc('monthly_recurring_transaction_summary', {
        p_wallet_id: walletId,
      });

      if (token !== this.recurringRequestToken) {
        return;
      }

      if (error) {
        throw error;
      }

      const entries = (data ?? [])
        .map((row: MonthlyRecurringTransactionRow) => this.mapRecurringSummaryRow(row))
        .sort(
          (a: RecurringTransactionSummaryEntry, b: RecurringTransactionSummaryEntry) =>
            b.monthStart.getTime() - a.monthStart.getTime(),
        );

      this.recurringState.set({
        loading: false,
        error: null,
        entries,
      });

      const currentSelection = this.selectedRecurringMonth();
      const nextSelection =
        !force &&
        currentSelection &&
        entries.some((entry: RecurringTransactionSummaryEntry) => entry.id === currentSelection)
          ? currentSelection
          : this.resolveDefaultRecurringMonth(entries);

      this.selectedRecurringMonth.set(nextSelection);
    } catch (error) {
      if (token !== this.recurringRequestToken) {
        return;
      }

      logError('DashboardStore', 'Failed to load recurring transaction summary', error);
      this.recurringState.set({
        loading: false,
        error: this.describeError(error),
        entries: [],
      });
      this.selectedRecurringMonth.set(null);
    }
  }

  private async loadPlaceSummary(force = false): Promise<void> {
    if (!this.userId()) {
      return;
    }
    const walletId = this.selectedWallet();
    if (!walletId) {
      return;
    }

    if (!force && this.placeState().loading) {
      return;
    }

    const token = ++this.placeRequestToken;
    this.placeState.set({
      loading: true,
      error: null,
      entries: [],
    });

    try {
      const { data, error } = await this.supabase.rpc('place_expense_summary', {
        p_year: this.selectedPlaceYear(),
        p_wallet_id: walletId,
      });

      if (token !== this.placeRequestToken) {
        return;
      }

      if (error) {
        throw error;
      }

      const entries = (data ?? []).map((row: PlaceExpenseSummaryRow) => this.mapPlaceSummaryRow(row));
      this.placeState.set({
        loading: false,
        error: null,
        entries,
      });
    } catch (error) {
      if (token !== this.placeRequestToken) {
        return;
      }

      logError('DashboardStore', 'Failed to load place expense summary', error);
      this.placeState.set({
        loading: false,
        error: this.describeError(error),
        entries: [],
      });
    }
  }

  private mapWalletRow(row: WalletRow): WalletOption {
    return {
      id: row.id,
      name: row.name,
      isDefault: row.is_default,
    };
  }

  private mapStructureRow(row: MonthlyCashflowRow): MonthlyStructureEntry {
    const monthStart = this.normalizeDate(row.month_start);
    const incomeTotal = this.parseNumeric(row.income_total);
    const expenseTotal = this.parseNumeric(row.expense_total);

    return {
      id: row.month_start,
      monthStart,
      incomeTotal,
      expenseTotal,
      netTotal: incomeTotal - expenseTotal,
    };
  }

  private mapMonthRow(row: AvailableMonthRow): MonthOption {
    const date = this.normalizeDate(row.month_start);
    return {
      value: this.buildMonthValue(date),
      date,
      label: this.buildMonthValue(date),
    };
  }

  private mapCategoryRow(row: MonthlyCategoryCashflowRow): CategoryStructureEntry {
    return {
      categoryId: row.category_id,
      categoryName: row.category_name,
      color: row.category_color,
      icon: row.category_icon,
      direction: (row.direction ?? 'expense') as TransactionDirection,
      totalAmount: this.parseNumeric(row.total_amount),
      transactionCount: this.parseCount(row.transaction_count),
    };
  }

  private mapRecurringSummaryRow(row: MonthlyRecurringTransactionRow): RecurringTransactionSummaryEntry {
    const monthStart = this.normalizeDate(row.month_start);
    const incomeTotal = this.parseNumeric(row.income_total);
    const expenseTotal = this.parseNumeric(row.expense_total);

    return {
      id: this.buildMonthValue(monthStart),
      monthStart,
      incomeTotal,
      expenseTotal,
      netTotal: incomeTotal - expenseTotal,
      transactionCount: this.parseCount(row.transaction_count),
    };
  }

  private mapPlaceSummaryRow(row: PlaceExpenseSummaryRow): PlaceExpenseSummaryEntry {
    return {
      placeId: row.place_id,
      placeName: row.place_name,
      street: row.street ?? null,
      city: row.city ?? null,
      postalCode: row.postal_code ?? null,
      country: row.country ?? null,
      totalAmount: this.parseNumeric(row.total_amount),
      transactionCount: this.parseCount(row.transaction_count),
      latestTransactionAt: row.latest_transaction_at ? this.normalizeDate(row.latest_transaction_at) : null,
    };
  }

  private resolveWalletSelection(wallets: readonly WalletOption[]): string | null {
    if (wallets.length === 0) {
      return null;
    }

    const preferred = wallets.find((wallet) => wallet.isDefault);
    return (preferred ?? wallets[0]).id;
  }

  private resolveDefaultMonth(options: readonly MonthOption[]): string | null {
    if (options.length === 0) {
      return null;
    }

    const now = new Date();
    const currentValue = this.buildMonthValue(now);
    const hasCurrent = options.some((option) => option.value === currentValue);
    if (hasCurrent) {
      return currentValue;
    }

    return options[0]?.value ?? null;
  }

  private resolveDefaultRecurringMonth(entries: readonly RecurringTransactionSummaryEntry[]): string | null {
    if (entries.length === 0) {
      return null;
    }

    const now = new Date();
    const currentValue = this.buildMonthValue(now);
    const hasCurrent = entries.some((entry) => entry.id === currentValue);
    if (hasCurrent) {
      return currentValue;
    }

    return entries[0]?.id ?? null;
  }

  private buildMonthValue(date: Date): string {
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}-01`;
  }

  private normalizeDate(value: string | Date): Date {
    if (value instanceof Date) {
      return value;
    }

    return new Date(value);
  }

  private parseNumeric(value: number | string | null | undefined): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private parseCount(value: number | string | null | undefined): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private describeError(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string'
    ) {
      return (error as { message?: string }).message ?? 'Unknown error';
    }

    return 'Unable to load dashboard data.';
  }
}

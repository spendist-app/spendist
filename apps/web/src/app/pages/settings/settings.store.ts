import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from '../../core/auth.service';
import {
  ProfileService,
  mapProfileRow,
  type ProfileEntity,
} from '../../core/profile.service';
import { SUPABASE_CLIENT } from '../../core/supabase';
import { canonicalHeroIconName } from '../../shared/icons/heroicons';
import { logError } from '../../core/logger';
import type { CategoryGroupRow, CategoryRow, WalletRow, Tables } from '@spendist/data-access/supabase-types';

export interface CategoryEntity {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly color: string | null;
  readonly icon: string | null;
  readonly groupId: string;
  readonly parentId: string | null;
}

export interface CategoryGroupEntity {
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

export interface CategoryPayload {
  readonly name: string;
  readonly color: string | null;
  readonly icon: string | null;
  readonly groupId: string;
  readonly parentId: string | null;
}

export interface CategoryGroupPayload {
  readonly name: string;
  readonly color: string | null;
  readonly icon: string | null;
}

export interface WalletPayload {
  readonly name: string;
  readonly currencyId: number;
  readonly isDefault: boolean;
}

interface CurrencyOption {
  readonly id: number;
  readonly symbol: string;
}

type CurrencyRow = Tables<'currencies'>;
type ProfileRow = Tables<'profiles'>;

const AVATAR_BUCKET = 'avatars';
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_MIME_TO_EXTENSION = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

interface SettingsState {
  readonly loading: boolean;
  readonly categories: readonly CategoryEntity[];
  readonly groups: readonly CategoryGroupEntity[];
  readonly wallets: readonly WalletEntity[];
  readonly currencies: readonly CurrencyOption[];
  readonly profile: ProfileEntity | null;
  readonly error: string | null;
  readonly profileMutationPending: boolean;
  readonly profileError: string | null;
  readonly categoryMutationPending: boolean;
  readonly groupMutationPending: boolean;
  readonly walletMutationPending: boolean;
  readonly walletError: string | null;
}

class SettingsStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SettingsStoreError';
  }
}

@Injectable()
export class SettingsStore {
  private readonly supabase = inject<SupabaseClient>(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);

  private readonly userId = signal<string | null>(null);
  private readonly state = signal<SettingsState>({
    loading: true,
    categories: [],
    groups: [],
    wallets: [],
    currencies: [],
    profile: null,
    error: null,
    profileMutationPending: false,
    profileError: null,
    categoryMutationPending: false,
    groupMutationPending: false,
    walletMutationPending: false,
    walletError: null,
  });

  readonly categories = computed(() => this.state().categories);
  readonly groups = computed(() => this.state().groups);
  readonly wallets = computed(() => this.state().wallets);
  readonly currencies = computed(() => this.state().currencies);
  readonly profile = computed(() => this.state().profile);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly profileMutationPending = computed(() => this.state().profileMutationPending);
  readonly profileError = computed(() => this.state().profileError);
  readonly categoryMutationPending = computed(() => this.state().categoryMutationPending);
  readonly groupMutationPending = computed(() => this.state().groupMutationPending);
  readonly walletMutationPending = computed(() => this.state().walletMutationPending);
  readonly walletError = computed(() => this.state().walletError);

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
          categories: [],
          groups: [],
          wallets: [],
          currencies: [],
          profile: null,
          error: null,
          profileMutationPending: false,
          profileError: null,
          categoryMutationPending: false,
          groupMutationPending: false,
          walletMutationPending: false,
          walletError: null,
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
  }

  async refresh(): Promise<void> {
    const userId = this.userId();
    if (!userId) {
      this.state.update((state) => ({
        ...state,
        loading: false,
        categories: [],
        groups: [],
        wallets: [],
        currencies: [],
        profile: null,
        walletMutationPending: false,
        profileMutationPending: false,
        walletError: null,
        profileError: null,
      }));
      return;
    }

    this.state.update((state) => ({
      ...state,
      loading: true,
      error: null,
    }));

    try {
      const [profileResult, groupsResult, categoriesResult, walletsResult, currenciesResult] = await Promise.all([
        this.supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
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
          .from('wallets')
          .select('*')
          .eq('owner_id', userId)
          .order('is_default', { ascending: false })
          .order('name', { ascending: true }),
        this.supabase.from('currencies').select('*').order('symbol', { ascending: true }),
      ]);

      if (profileResult.error) {
        throw profileResult.error;
      }

      if (groupsResult.error) {
        throw groupsResult.error;
      }

      if (categoriesResult.error) {
        throw categoriesResult.error;
      }

      if (walletsResult.error) {
        throw walletsResult.error;
      }

      if (currenciesResult.error) {
        throw currenciesResult.error;
      }

      const groups = this.sortGroups(
        (groupsResult.data ?? []).map((group) => this.mapGroupRow(group as CategoryGroupRow)),
      );
      const profile = profileResult.data ? mapProfileRow(profileResult.data as ProfileRow) : null;
      this.profileService.setProfile(profile);
      const categories = this.sortCategories(
        (categoriesResult.data ?? []).map((category) => this.mapCategoryRow(category as CategoryRow)),
      );
      const currenciesRaw = (currenciesResult.data ?? []).map((currency) => this.mapCurrencyRow(currency as CurrencyRow));
      const currencies = this.sortCurrencies(currenciesRaw);
      const currencyLookup = new Map(currenciesRaw.map((currency) => [currency.id, currency.symbol]));
      const wallets = this.sortWallets(
        (walletsResult.data ?? []).map((wallet) => this.mapWalletRow(wallet as WalletRow, currencyLookup)),
      );

      this.state.set({
        loading: false,
        error: null,
        categoryMutationPending: false,
        groupMutationPending: false,
        walletMutationPending: false,
        profileMutationPending: false,
        walletError: null,
        profileError: null,
        profile,
        categories,
        groups,
        wallets,
        currencies,
      });
    } catch (error) {
      const message = this.describeError(error);
      logError('SettingsStore', 'Failed to refresh data', error);
      this.state.update((state) => ({
        ...state,
        loading: false,
        error: message,
        walletMutationPending: false,
        profileMutationPending: false,
        walletError: message,
        profileError: message,
      }));
      throw new SettingsStoreError(message);
    }
  }

  async createCategory(payload: CategoryPayload): Promise<CategoryEntity> {
    const userId = this.requireUserId();
    this.setCategoryPending(true);

    try {
      this.ensureGroupExists(payload.groupId);
      this.ensureParentCategoryExists(payload.parentId, payload.groupId);

      const { data, error } = await this.supabase
        .from('categories')
        .insert({
          owner_id: userId,
          name: payload.name.trim(),
          color: this.normalizeColor(payload.color),
          icon: this.normalizeIcon(payload.icon),
          group_id: payload.groupId,
          parent_id: payload.parentId,
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new SettingsStoreError('Supabase returned empty response.');
      }

      const entity = this.mapCategoryRow(this.requireRow(data));
      this.state.update((state) => ({
        ...state,
        error: null,
        categories: this.sortCategories([...state.categories, entity]),
      }));

      return entity;
    } catch (error) {
      const message = this.describeCategoryError(error);
      this.state.update((state) => ({
        ...state,
        error: message,
      }));
      throw new SettingsStoreError(message);
    } finally {
      this.setCategoryPending(false);
    }
  }

  async updateCategory(categoryId: string, payload: CategoryPayload): Promise<void> {
    const userId = this.requireUserId();
    this.setCategoryPending(true);

    try {
      this.ensureGroupExists(payload.groupId);
      this.ensureParentCategoryExists(payload.parentId, payload.groupId, categoryId);

      const { error, data } = await this.supabase
        .from('categories')
        .update({
          name: payload.name.trim(),
          color: this.normalizeColor(payload.color),
          icon: this.normalizeIcon(payload.icon),
          group_id: payload.groupId,
          parent_id: payload.parentId,
        })
        .eq('id', categoryId)
        .eq('owner_id', userId)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new SettingsStoreError('Supabase returned empty response.');
      }

      const entity = this.mapCategoryRow(this.requireRow(data));
      this.state.update((state) => ({
        ...state,
        error: null,
        categories: this.sortCategories(
          state.categories.map((category) => (category.id === categoryId ? entity : category)),
        ),
      }));
    } catch (error) {
      const message = this.describeCategoryError(error);
      this.state.update((state) => ({
        ...state,
        error: message,
      }));
      throw new SettingsStoreError(message);
    } finally {
      this.setCategoryPending(false);
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const userId = this.requireUserId();
    this.setCategoryPending(true);

    try {
      const { error } = await this.supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('owner_id', userId);

      if (error) {
        throw error;
      }

      this.state.update((state) => ({
        ...state,
        error: null,
        categories: state.categories.filter((category) => category.id !== categoryId),
      }));
    } catch (error) {
      const message = this.describeCategoryError(error);
      this.state.update((state) => ({
        ...state,
        error: message,
      }));
      throw new SettingsStoreError(message);
    } finally {
      this.setCategoryPending(false);
    }
  }

  async createGroup(payload: CategoryGroupPayload): Promise<CategoryGroupEntity> {
    const userId = this.requireUserId();
    this.setGroupPending(true);

    try {
      const { data, error } = await this.supabase
        .from('categories_group')
        .insert({
          owner_id: userId,
          name: payload.name.trim(),
          color: this.normalizeColor(payload.color),
          icon: this.normalizeIcon(payload.icon),
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const entity = this.mapGroupRow(this.requireRow(data));
      this.state.update((state) => ({
        ...state,
        error: null,
        groups: this.sortGroups([...state.groups, entity]),
      }));

      return entity;
    } catch (error) {
      const message = this.describeGroupError(error);
      this.state.update((state) => ({
        ...state,
        error: message,
      }));
      throw new SettingsStoreError(message);
    } finally {
      this.setGroupPending(false);
    }
  }

  async updateGroup(groupId: string, payload: CategoryGroupPayload): Promise<void> {
    const userId = this.requireUserId();
    this.setGroupPending(true);

    try {
      const { data, error } = await this.supabase
        .from('categories_group')
        .update({
          name: payload.name.trim(),
          color: this.normalizeColor(payload.color),
          icon: this.normalizeIcon(payload.icon),
        })
        .eq('id', groupId)
        .eq('owner_id', userId)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const entity = this.mapGroupRow(this.requireRow(data));
      this.state.update((state) => ({
        ...state,
        error: null,
        groups: this.sortGroups(
          state.groups.map((group) => (group.id === groupId ? entity : group)),
        ),
      }));
    } catch (error) {
      const message = this.describeGroupError(error);
      this.state.update((state) => ({
        ...state,
        error: message,
      }));
      throw new SettingsStoreError(message);
    } finally {
      this.setGroupPending(false);
    }
  }

  async deleteGroup(groupId: string): Promise<void> {
    const userId = this.requireUserId();
    this.setGroupPending(true);

    try {
      const hasCategories = this.state()
        .categories.some((category) => category.groupId === groupId);

      if (hasCategories) {
        const message = 'Move or delete categories assigned to this group before deleting it.';
        this.state.update((state) => ({
          ...state,
          error: message,
        }));
        throw new SettingsStoreError(message);
      }

      const { error } = await this.supabase
        .from('categories_group')
        .delete()
        .eq('id', groupId)
        .eq('owner_id', userId);

      if (error) {
        throw error;
      }

      this.state.update((state) => ({
        ...state,
        error: null,
        groups: state.groups.filter((group) => group.id !== groupId),
      }));
    } catch (error) {
      const message = this.describeGroupError(error);
      this.state.update((state) => ({
        ...state,
        error: message,
      }));
      throw new SettingsStoreError(message);
    } finally {
      this.setGroupPending(false);
    }
  }

  clearError(): void {
    this.state.update((state) => ({
      ...state,
      error: null,
    }));
  }

  clearWalletError(): void {
    this.state.update((state) => ({
      ...state,
      walletError: null,
    }));
  }

  clearProfileError(): void {
    this.state.update((state) => ({
      ...state,
      profileError: null,
    }));
  }

  async uploadAvatar(file: File): Promise<void> {
    const userId = this.requireUserId();
    this.setProfilePending(true);
    this.setProfileError(null);

    try {
      const extension = this.resolveAvatarExtension(file);
      const avatarPath = `${userId}/avatar.${extension}`;

      const { error: uploadError } = await this.supabase.storage
        .from(AVATAR_BUCKET)
        .upload(avatarPath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const publicUrl = this.supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(avatarPath).data.publicUrl;
      const avatarUrl = `${publicUrl}?v=${Date.now()}`;

      const { data, error } = await this.supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const profile = mapProfileRow(this.requireRow(data as ProfileRow | null));
      this.profileService.setProfile(profile);
      this.state.update((state) => ({
        ...state,
        profile,
        profileError: null,
      }));
    } catch (error) {
      const message = this.describeProfileError(error);
      this.setProfileError(message);
      throw new SettingsStoreError(message);
    } finally {
      this.setProfilePending(false);
    }
  }

  async createWallet(payload: WalletPayload): Promise<void> {
    const userId = this.requireUserId();
    const name = payload.name.trim();
    if (!name) {
      const message = 'settings.panels.wallets.errors.nameRequired';
      this.setWalletError(message);
      throw new SettingsStoreError(message);
    }

    this.setWalletPending(true);
    this.setWalletError(null);

    try {
      if (payload.isDefault) {
        const { error: clearError } = await this.supabase
          .from('wallets')
          .update({ is_default: false })
          .eq('owner_id', userId);
        if (clearError) {
          throw clearError;
        }
      }

      const { error } = await this.supabase
        .from('wallets')
        .insert({
          owner_id: userId,
          name,
          currency_id: payload.currencyId,
          is_default: payload.isDefault,
        });

      if (error) {
        throw error;
      }

      await this.refresh();
    } catch (error) {
      const message = this.describeWalletError(error);
      this.setWalletError(message);
      throw new SettingsStoreError(message);
    } finally {
      this.setWalletPending(false);
    }
  }

  async updateWallet(walletId: string, payload: WalletPayload): Promise<void> {
    const userId = this.requireUserId();
    const name = payload.name.trim();
    if (!name) {
      const message = 'settings.panels.wallets.errors.nameRequired';
      this.setWalletError(message);
      throw new SettingsStoreError(message);
    }

    const currentWallet = this.state().wallets.find((wallet) => wallet.id === walletId);
    if (!currentWallet) {
      const message = 'settings.panels.wallets.errors.notFound';
      this.setWalletError(message);
      throw new SettingsStoreError(message);
    }

    this.setWalletPending(true);
    this.setWalletError(null);

    try {
      if (payload.isDefault) {
        const { error: clearError } = await this.supabase
          .from('wallets')
          .update({ is_default: false })
          .eq('owner_id', userId)
          .neq('id', walletId);
        if (clearError) {
          throw clearError;
        }
      }

      const { error } = await this.supabase
        .from('wallets')
        .update({
          name,
          currency_id: payload.currencyId,
          is_default: payload.isDefault,
        })
        .eq('owner_id', userId)
        .eq('id', walletId);

      if (error) {
        throw error;
      }

      await this.refresh();
    } catch (error) {
      const message = this.describeWalletError(error);
      this.setWalletError(message);
      throw new SettingsStoreError(message);
    } finally {
      this.setWalletPending(false);
    }
  }

  private requireUserId(): string {
    const userId = this.userId();
    if (!userId) {
      const message = 'You need to be signed in to manage settings.';
      throw new SettingsStoreError(message);
    }
    return userId;
  }

  private ensureGroupExists(groupId: string): void {
    const groupExists = this.state()
      .groups.some((group) => group.id === groupId);
    if (!groupExists) {
      const message = 'Select a valid category group before saving.';
      throw new SettingsStoreError(message);
    }
  }

  private ensureParentCategoryExists(
    parentId: string | null,
    groupId: string,
    categoryId?: string,
  ): void {
    if (!parentId) {
      return;
    }

    const parent = this.state().categories.find((category) => category.id === parentId);
    if (!parent || parent.groupId !== groupId || parent.id === categoryId) {
      const message = 'Select a valid parent category before saving.';
      throw new SettingsStoreError(message);
    }
  }

  private setWalletPending(pending: boolean): void {
    this.state.update((state) => ({
      ...state,
      walletMutationPending: pending,
    }));
  }

  private setWalletError(message: string | null): void {
    this.state.update((state) => ({
      ...state,
      walletError: message,
    }));
  }

  private setProfilePending(pending: boolean): void {
    this.state.update((state) => ({
      ...state,
      profileMutationPending: pending,
    }));
  }

  private setProfileError(message: string | null): void {
    this.state.update((state) => ({
      ...state,
      profileError: message,
    }));
  }

  private mapCategoryRow(row: CategoryRow): CategoryEntity {
    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      color: row.color ?? null,
      icon: this.normalizeIcon(row.icon),
      groupId: row.group_id,
      parentId: row.parent_id ?? null,
    };
  }

  private mapGroupRow(row: CategoryGroupRow): CategoryGroupEntity {
    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      color: row.color ?? null,
      icon: this.normalizeIcon(row.icon),
    };
  }

  private mapWalletRow(row: WalletRow, currencyLookup: ReadonlyMap<number, string>): WalletEntity {
    const currencyId = row.currency_id ?? 1;
    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      isDefault: !!row.is_default,
      currencyId,
      currency: currencyLookup.get(currencyId) ?? 'PLN',
    };
  }

  private mapCurrencyRow(row: CurrencyRow): CurrencyOption {
    return {
      id: row.id,
      symbol: row.symbol.toUpperCase(),
    };
  }

  private sortCategories(categories: readonly CategoryEntity[]): readonly CategoryEntity[] {
    return [...categories].sort((a, b) => {
      if (a.groupId !== b.groupId) {
        return a.groupId.localeCompare(b.groupId);
      }
      return a.name.localeCompare(b.name);
    });
  }

  private sortWallets(wallets: readonly WalletEntity[]): readonly WalletEntity[] {
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

  private sortGroups(groups: readonly CategoryGroupEntity[]): readonly CategoryGroupEntity[] {
    return [...groups].sort((a, b) => a.name.localeCompare(b.name));
  }

  private sortCurrencies(currencies: readonly CurrencyOption[]): readonly CurrencyOption[] {
    return [...currencies].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  private setCategoryPending(pending: boolean): void {
    this.state.update((state) => ({
      ...state,
      categoryMutationPending: pending,
    }));
  }

  private setGroupPending(pending: boolean): void {
    this.state.update((state) => ({
      ...state,
      groupMutationPending: pending,
    }));
  }

  private normalizeColor(value: string | null): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeIcon(value: string | null): string | null {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) {
      return null;
    }

    const canonical = canonicalHeroIconName(trimmed);
    return canonical || trimmed;
  }

  private resolveAvatarExtension(file: File): string {
    if (file.size > AVATAR_MAX_BYTES) {
      throw new SettingsStoreError('settings.panels.profile.avatar.errors.tooLarge');
    }

    const extension = AVATAR_MIME_TO_EXTENSION.get(file.type);
    if (!extension) {
      throw new SettingsStoreError('settings.panels.profile.avatar.errors.unsupportedType');
    }

    return extension;
  }

  private requireRow<T>(row: T | null | undefined): T {
    if (row == null) {
      throw new SettingsStoreError('Supabase returned empty response.');
    }
    return row;
  }

  private describeError(error: unknown): string {
    if (error instanceof SettingsStoreError) {
      return error.message;
    }

    if (this.isPostgrestError(error)) {
      return error.message ?? 'Unexpected Supabase error.';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Something went wrong. Please try again.';
  }

  private describeWalletError(error: unknown): string {
    if (error instanceof SettingsStoreError) {
      return error.message;
    }

    if (this.isPostgrestError(error)) {
      if (error.code === '23505') {
        return 'settings.panels.wallets.errors.onlyOneDefault';
      }
      return 'settings.panels.wallets.errors.generic';
    }

    if (error instanceof Error) {
      return 'settings.panels.wallets.errors.generic';
    }

    return 'settings.panels.wallets.errors.generic';
  }

  private describeCategoryError(error: unknown): string {
    if (error instanceof SettingsStoreError) {
      return error.message;
    }

    if (this.isPostgrestError(error)) {
      if (error.code === '23505') {
        return 'Category name already exists. Choose a different name.';
      }
      if (error.code === '23503') {
        return 'Select a valid category group before saving.';
      }

      return error.message ?? 'Unable to update the category.';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unable to update the category.';
  }

  private describeGroupError(error: unknown): string {
    if (error instanceof SettingsStoreError) {
      return error.message;
    }

    if (this.isPostgrestError(error)) {
      if (error.code === '23505') {
        return 'Category group name already exists. Choose a different name.';
      }
      if (error.code === '23503') {
        return 'Move categories to another group before deleting this one.';
      }

      return error.message ?? 'Unable to update the category group.';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unable to update the category group.';
  }

  private describeProfileError(error: unknown): string {
    if (error instanceof SettingsStoreError) {
      return error.message;
    }

    return 'settings.panels.profile.avatar.errors.generic';
  }

  private isPostgrestError(error: unknown): error is PostgrestError {
    return !!error && typeof error === 'object' && 'code' in error && 'message' in error;
  }
}

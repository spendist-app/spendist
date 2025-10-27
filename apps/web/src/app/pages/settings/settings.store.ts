import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from '../../core/auth.service';
import { SUPABASE_CLIENT } from '../../core/supabase';
import { canonicalHeroIconName } from '../../shared/icons/heroicons';
import type { CategoryGroupRow, CategoryRow } from '@spendist/data-access/supabase-types';

export interface CategoryEntity {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly color: string | null;
  readonly icon: string | null;
  readonly groupId: string;
}

export interface CategoryGroupEntity {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly color: string | null;
  readonly icon: string | null;
}

export interface CategoryPayload {
  readonly name: string;
  readonly color: string | null;
  readonly icon: string | null;
  readonly groupId: string;
}

export interface CategoryGroupPayload {
  readonly name: string;
  readonly color: string | null;
  readonly icon: string | null;
}

interface SettingsState {
  readonly loading: boolean;
  readonly categories: readonly CategoryEntity[];
  readonly groups: readonly CategoryGroupEntity[];
  readonly error: string | null;
  readonly categoryMutationPending: boolean;
  readonly groupMutationPending: boolean;
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

  private readonly userId = signal<string | null>(null);
  private readonly state = signal<SettingsState>({
    loading: true,
    categories: [],
    groups: [],
    error: null,
    categoryMutationPending: false,
    groupMutationPending: false,
  });

  readonly categories = computed(() => this.state().categories);
  readonly groups = computed(() => this.state().groups);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly categoryMutationPending = computed(() => this.state().categoryMutationPending);
  readonly groupMutationPending = computed(() => this.state().groupMutationPending);

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
          error: null,
          categoryMutationPending: false,
          groupMutationPending: false,
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
      }));
      return;
    }

    this.state.update((state) => ({
      ...state,
      loading: true,
      error: null,
    }));

    try {
      const [groupsResult, categoriesResult] = await Promise.all([
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
      ]);

      if (groupsResult.error) {
        throw groupsResult.error;
      }

      if (categoriesResult.error) {
        throw categoriesResult.error;
      }

      const groups = this.sortGroups(
        (groupsResult.data ?? []).map((group) => this.mapGroupRow(group as CategoryGroupRow)),
      );
      const categories = this.sortCategories(
        (categoriesResult.data ?? []).map((category) => this.mapCategoryRow(category as CategoryRow)),
      );

      this.state.set({
        loading: false,
        error: null,
        categoryMutationPending: false,
        groupMutationPending: false,
        categories,
        groups,
      });
    } catch (error) {
      const message = this.describeError(error);
      console.error('[SettingsStore] Failed to refresh data:', error);
      this.state.update((state) => ({
        ...state,
        loading: false,
        error: message,
      }));
      throw new SettingsStoreError(message);
    }
  }

  async createCategory(payload: CategoryPayload): Promise<CategoryEntity> {
    const userId = this.requireUserId();
    this.setCategoryPending(true);

    try {
      this.ensureGroupExists(payload.groupId);

      const { data, error } = await this.supabase
        .from('categories')
        .insert({
          owner_id: userId,
          name: payload.name.trim(),
          color: this.normalizeColor(payload.color),
          icon: this.normalizeIcon(payload.icon),
          group_id: payload.groupId,
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

      const { error, data } = await this.supabase
        .from('categories')
        .update({
          name: payload.name.trim(),
          color: this.normalizeColor(payload.color),
          icon: this.normalizeIcon(payload.icon),
          group_id: payload.groupId,
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

  private mapCategoryRow(row: CategoryRow): CategoryEntity {
    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      color: row.color ?? null,
      icon: this.normalizeIcon(row.icon),
      groupId: row.group_id,
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

  private sortCategories(categories: readonly CategoryEntity[]): readonly CategoryEntity[] {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }

  private sortGroups(groups: readonly CategoryGroupEntity[]): readonly CategoryGroupEntity[] {
    return [...groups].sort((a, b) => a.name.localeCompare(b.name));
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

  private isPostgrestError(error: unknown): error is PostgrestError {
    return !!error && typeof error === 'object' && 'code' in error && 'message' in error;
  }
}

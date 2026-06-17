import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { AuthService } from '../../../core/auth.service';
import { logError } from '../../../core/logger';
import { SUPABASE_CLIENT } from '../../../core/supabase';
import type { PlaceRow } from '@spendist/data-access/supabase-types';

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

export interface PlacePayload {
  readonly name: string;
  readonly street: string | null;
  readonly city: string | null;
  readonly postalCode: string | null;
  readonly country: string | null;
  readonly note: string | null;
}

interface PlacesState {
  readonly loading: boolean;
  readonly mutationPending: boolean;
  readonly error: string | null;
  readonly places: readonly PlaceEntity[];
}

class PlacesStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlacesStoreError';
  }
}

@Injectable()
export class PlacesStore {
  private readonly supabase = inject<SupabaseClient>(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);
  private readonly userId = signal<string | null>(null);
  private readonly state = signal<PlacesState>({
    loading: true,
    mutationPending: false,
    error: null,
    places: [],
  });

  readonly loading = computed(() => this.state().loading);
  readonly mutationPending = computed(() => this.state().mutationPending);
  readonly error = computed(() => this.state().error);
  readonly places = computed(() => this.state().places);
  readonly empty = computed(
    () => !this.loading() && !this.error() && this.places().length === 0
  );

  constructor() {
    effect(() => {
      if (this.auth.loading()) {
        return;
      }

      const userId = this.auth.session()?.user.id ?? null;
      this.userId.set(userId);

      if (!userId) {
        this.state.set({
          loading: false,
          mutationPending: false,
          error: null,
          places: [],
        });
        return;
      }

      void this.refresh();
    });
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
      const { data, error } = await this.supabase
        .from('places')
        .select('*')
        .eq('owner_id', userId)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      this.state.update((state) => ({
        ...state,
        loading: false,
        error: null,
        places: this.sortPlaces(
          (data ?? []).map((row) => this.mapPlaceRow(row as PlaceRow))
        ),
      }));
    } catch (error) {
      const message = this.describeError(error);
      logError('PlacesStore', 'Failed to load places', error);
      this.state.update((state) => ({
        ...state,
        loading: false,
        error: message,
      }));
    }
  }

  async createPlace(payload: PlacePayload): Promise<PlaceEntity> {
    const userId = this.requireUserId();
    const normalized = this.normalizePayload(payload);
    this.setPending(true);

    try {
      const { data, error } = await this.supabase
        .from('places')
        .insert({
          owner_id: userId,
          name: normalized.name,
          street: normalized.street,
          city: normalized.city,
          postal_code: normalized.postalCode,
          country: normalized.country,
          note: normalized.note,
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const place = this.mapPlaceRow(this.requireRow(data as PlaceRow | null));
      this.state.update((state) => ({
        ...state,
        error: null,
        places: this.sortPlaces([...state.places, place]),
      }));
      return place;
    } catch (error) {
      const message = this.describeError(error);
      this.state.update((state) => ({ ...state, error: message }));
      throw new PlacesStoreError(message);
    } finally {
      this.setPending(false);
    }
  }

  async updatePlace(placeId: string, payload: PlacePayload): Promise<void> {
    const userId = this.requireUserId();
    const normalized = this.normalizePayload(payload);
    this.setPending(true);

    try {
      const { data, error } = await this.supabase
        .from('places')
        .update({
          name: normalized.name,
          street: normalized.street,
          city: normalized.city,
          postal_code: normalized.postalCode,
          country: normalized.country,
          note: normalized.note,
        })
        .eq('owner_id', userId)
        .eq('id', placeId)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const place = this.mapPlaceRow(this.requireRow(data as PlaceRow | null));
      this.state.update((state) => ({
        ...state,
        error: null,
        places: this.sortPlaces(
          state.places.map((item) => (item.id === placeId ? place : item))
        ),
      }));
    } catch (error) {
      const message = this.describeError(error);
      this.state.update((state) => ({ ...state, error: message }));
      throw new PlacesStoreError(message);
    } finally {
      this.setPending(false);
    }
  }

  async deletePlace(placeId: string): Promise<void> {
    const userId = this.requireUserId();
    this.setPending(true);

    try {
      const { error } = await this.supabase
        .from('places')
        .delete()
        .eq('owner_id', userId)
        .eq('id', placeId);

      if (error) {
        throw error;
      }

      this.state.update((state) => ({
        ...state,
        error: null,
        places: state.places.filter((place) => place.id !== placeId),
      }));
    } catch (error) {
      const message = this.describeError(error);
      this.state.update((state) => ({ ...state, error: message }));
      throw new PlacesStoreError(message);
    } finally {
      this.setPending(false);
    }
  }

  clearError(): void {
    this.state.update((state) => ({
      ...state,
      error: null,
    }));
  }

  private normalizePayload(payload: PlacePayload): PlacePayload {
    const name = payload.name.trim();
    if (!name) {
      throw new PlacesStoreError('places.errors.nameRequired');
    }

    return {
      name: name.slice(0, 120),
      street: this.emptyToNull(payload.street, 160),
      city: this.emptyToNull(payload.city, 80),
      postalCode: this.emptyToNull(payload.postalCode, 32),
      country: this.emptyToNull(payload.country, 80),
      note: this.emptyToNull(payload.note, 500),
    };
  }

  private emptyToNull(value: string | null | undefined, max: number): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed ? trimmed.slice(0, max) : null;
  }

  private requireUserId(): string {
    const userId = this.userId();
    if (!userId) {
      throw new PlacesStoreError('places.errors.auth');
    }
    return userId;
  }

  private requireRow<T>(row: T | null | undefined): T {
    if (row == null) {
      throw new PlacesStoreError('places.errors.emptyResponse');
    }
    return row;
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

  private sortPlaces(places: readonly PlaceEntity[]): readonly PlaceEntity[] {
    return [...places].sort((a, b) => {
      const byName = a.name.localeCompare(b.name);
      return byName === 0
        ? (a.city ?? '').localeCompare(b.city ?? '')
        : byName;
    });
  }

  private setPending(pending: boolean): void {
    this.state.update((state) => ({
      ...state,
      mutationPending: pending,
    }));
  }

  private describeError(error: unknown): string {
    if (error instanceof PlacesStoreError) {
      return error.message;
    }

    if (this.isPostgrestError(error)) {
      return error.message ?? 'places.errors.generic';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'places.errors.generic';
  }

  private isPostgrestError(error: unknown): error is PostgrestError {
    return !!error && typeof error === 'object' && 'code' in error && 'message' in error;
  }
}

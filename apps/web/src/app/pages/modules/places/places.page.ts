import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { NgIcon } from '@ng-icons/core';
import { heroPencilSquare, heroTrash } from '@ng-icons/heroicons/outline';
import {
  PlaceDuplicateError,
  PlaceEntity,
  PlaceMergeResult,
  PlacesStore,
} from './places.store';
import { PlaceMergeDialogComponent } from './place-merge-dialog.component';
import { FORM_ERROR_DIRECTIVES } from '../../../shared/form-errors';
import { duplicatePlaceGroups } from '../../../shared/place-name/place-name';

@Component({
  standalone: true,
  selector: 'app-places-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ...FORM_ERROR_DIRECTIVES,
    ReactiveFormsModule,
    TranslocoPipe,
    NgIcon,
    PlaceMergeDialogComponent,
  ],
  providers: [PlacesStore],
  templateUrl: './places.page.html',
})
export class PlacesPageComponent {
  protected readonly editIcon = heroPencilSquare;
  protected readonly deleteIcon = heroTrash;
  protected readonly store = inject(PlacesStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly transloco = inject(TranslocoService);

  protected readonly editingPlaceId = signal<string | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly query = signal('');
  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly mergeOpen = signal(false);
  protected readonly duplicateOf = signal<PlaceEntity | null>(null);
  protected readonly notice = signal<string | null>(null);

  /** Places whose names differ only by case, spacing or diacritics. */
  protected readonly duplicateGroups = computed(() =>
    duplicatePlaceGroups(this.store.places())
  );

  /** Selected places in list order; the first one is kept by default. */
  protected readonly selectedPlaces = computed(() => {
    const selected = this.selectedIds();

    return this.store.places().filter((place) => selected.has(place.id));
  });
  protected readonly form = this.formBuilder.group({
    name: this.formBuilder.control('', {
      validators: [Validators.required, Validators.maxLength(120)],
      nonNullable: true,
    }),
    street: this.formBuilder.control('', {
      validators: [Validators.maxLength(160)],
      nonNullable: true,
    }),
    city: this.formBuilder.control('', {
      validators: [Validators.maxLength(80)],
      nonNullable: true,
    }),
    postalCode: this.formBuilder.control('', {
      validators: [Validators.maxLength(32)],
      nonNullable: true,
    }),
    country: this.formBuilder.control('', {
      validators: [Validators.maxLength(80)],
      nonNullable: true,
    }),
    note: this.formBuilder.control('', {
      validators: [Validators.maxLength(500)],
      nonNullable: true,
    }),
  });

  protected readonly visiblePlaces = computed(() => {
    const term = this.query().trim().toLowerCase();

    if (!term) {
      return this.store.places();
    }

    return this.store
      .places()
      .filter((place) =>
        [
          place.name,
          place.street,
          place.city,
          place.postalCode,
          place.country,
          place.note,
        ]
          .filter((value): value is string => !!value)
          .some((value) => value.toLowerCase().includes(term))
      );
  });

  protected readonly formTitleKey = computed(() =>
    this.editingPlaceId()
      ? 'places.form.title.edit'
      : 'places.form.title.create'
  );

  protected onSearch(event: Event): void {
    const input =
      event.target instanceof HTMLInputElement ? event.target : null;

    this.query.set(input?.value ?? '');
  }

  protected isSelected(placeId: string): boolean {
    return this.selectedIds().has(placeId);
  }

  protected toggleSelected(placeId: string): void {
    this.selectedIds.update((selected) => {
      const next = new Set(selected);

      if (!next.delete(placeId)) {
        next.add(placeId);
      }

      return next;
    });
  }

  protected clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  protected openMerge(
    places: readonly PlaceEntity[] = this.selectedPlaces()
  ): void {
    if (places.length < 2) {
      return;
    }

    this.selectedIds.set(new Set(places.map((place) => place.id)));
    this.notice.set(null);
    this.store.clearError();
    this.mergeOpen.set(true);
  }

  protected closeMerge(): void {
    this.mergeOpen.set(false);
  }

  protected onMerged(result: PlaceMergeResult): void {
    const editingId = this.editingPlaceId();

    if (editingId && result.mergedPlaceIds.includes(editingId)) {
      this.closeForm();
    }

    this.clearSelection();
    this.notice.set(
      this.transloco.translate('places.merge.done', {
        moved: result.movedTransactions,
      })
    );
  }

  protected openCreateForm(): void {
    this.duplicateOf.set(null);
    this.editingPlaceId.set(null);
    this.form.reset({
      name: '',
      street: '',
      city: '',
      postalCode: '',
      country: '',
      note: '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.store.clearError();
    this.formOpen.set(true);
  }

  protected openEditForm(place: PlaceEntity): void {
    this.duplicateOf.set(null);
    this.editingPlaceId.set(place.id);
    this.form.reset({
      name: place.name,
      street: place.street ?? '',
      city: place.city ?? '',
      postalCode: place.postalCode ?? '',
      country: place.country ?? '',
      note: place.note ?? '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.store.clearError();
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingPlaceId.set(null);
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  protected async submit(): Promise<void> {
    if (this.store.mutationPending()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const raw = this.form.getRawValue();
    this.duplicateOf.set(null);

    const payload = {
      name: raw.name,
      street: raw.street,
      city: raw.city,
      postalCode: raw.postalCode,
      country: raw.country,
      note: raw.note,
    };

    try {
      const editingId = this.editingPlaceId();

      if (editingId) {
        await this.store.updatePlace(editingId, payload);
      } else {
        await this.store.createPlace(payload);
      }

      this.closeForm();
    } catch (error) {
      if (error instanceof PlaceDuplicateError) {
        this.duplicateOf.set(error.existing);
        this.form.controls.name.setErrors({ duplicate: true });
        this.form.controls.name.markAsTouched();
      }
    }
  }

  protected async deletePlace(place: PlaceEntity): Promise<void> {
    const confirmed = window.confirm(
      this.transloco.translate('places.actions.deleteConfirm', {
        name: place.name,
      })
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.store.deletePlace(place.id);
      this.selectedIds.update(
        (selected) => new Set([...selected].filter((id) => id !== place.id))
      );

      if (this.editingPlaceId() === place.id) {
        this.closeForm();
      }
    } catch {
      return;
    }
  }

  protected formatAddress(place: PlaceEntity): string {
    return [place.street, place.postalCode, place.city, place.country]
      .filter((value): value is string => !!value)
      .join(', ');
  }

  protected displayError(message: string | null): string | null {
    if (!message) {
      return null;
    }

    return message.includes('.') ? this.transloco.translate(message) : message;
  }
}

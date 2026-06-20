import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { NgIcon } from '@ng-icons/core';
import { heroPencilSquare, heroTrash } from '@ng-icons/heroicons/outline';
import { PlaceEntity, PlacesStore } from './places.store';

@Component({
  standalone: true,
  selector: 'app-places-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe, NgIcon],
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

    return this.store.places().filter((place) =>
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
    this.editingPlaceId() ? 'places.form.title.edit' : 'places.form.title.create'
  );

  protected onSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.query.set(input?.value ?? '');
  }

  protected openCreateForm(): void {
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
    } catch {
      return;
    }
  }

  protected async deletePlace(place: PlaceEntity): Promise<void> {
    const confirmed = window.confirm(
      this.transloco.translate('places.actions.deleteConfirm', { name: place.name })
    );
    if (!confirmed) {
      return;
    }

    try {
      await this.store.deletePlace(place.id);
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

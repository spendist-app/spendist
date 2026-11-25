import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { LogoComponent } from '../../../shared/logo/logo.component';
import {
  PlaceEntity,
  PlaceMergePreview,
  PlaceMergeResult,
  PlacesStore,
} from './places.store';

/**
 * Modal that merges two or more places: the user picks the place to keep,
 * reviews how many transactions move, and confirms.
 */
@Component({
  standalone: true,
  selector: 'app-place-merge-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, LogoComponent],
  templateUrl: './place-merge-dialog.component.html',
})
export class PlaceMergeDialogComponent {
  readonly places = input.required<readonly PlaceEntity[]>();
  readonly closed = output<void>();
  readonly merged = output<PlaceMergeResult>();

  protected readonly store = inject(PlacesStore);
  private readonly transloco = inject(TranslocoService);
  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly targetId = signal<string | null>(null);
  protected readonly preview = signal<PlaceMergePreview | null>(null);
  protected readonly error = signal<string | null>(null);
  private previewRequest = 0;

  protected readonly target = computed(
    () => this.places().find((place) => place.id === this.targetId()) ?? null
  );

  protected readonly filledFields = computed(() => {
    const preview = this.preview();

    const fields = (preview?.filledFields ?? []).map((field) =>
      this.transloco.translate(`places.form.fields.${field}`)
    );

    if (preview?.fillsLogo) {
      fields.push(this.transloco.translate('logos.field.label'));
    }

    return fields.join(', ');
  });

  constructor() {
    afterNextRender(() => {
      const dialog = this.dialog().nativeElement;

      // The native modal makes the page inert, contains focus, handles Esc
      // and the back gesture, and returns focus to the invoker on close.
      if ('showModal' in HTMLDialogElement.prototype && !dialog.open) {
        dialog.showModal();
      }

      const [first] = this.places();

      if (first) {
        void this.selectTarget(first.id);
      }
    });
  }

  protected transactionCount(placeId: string): number | null {
    return (
      this.preview()?.places.find((place) => place.id === placeId)
        ?.transactionCount ?? null
    );
  }

  protected async selectTarget(placeId: string): Promise<void> {
    const request = ++this.previewRequest;
    this.targetId.set(placeId);
    this.preview.set(null);
    this.error.set(null);

    try {
      const preview = await this.store.previewMerge(
        placeId,
        this.sourceIds(placeId)
      );

      if (request === this.previewRequest) {
        this.preview.set(preview);
      }
    } catch (error) {
      if (request === this.previewRequest) {
        this.error.set(
          this.translateMessage(
            error instanceof Error ? error.message : 'places.errors.merge'
          )
        );
      }
    }
  }

  protected async confirm(): Promise<void> {
    const targetId = this.targetId();

    if (!targetId || !this.preview() || this.store.mutationPending()) {
      return;
    }

    this.error.set(null);

    try {
      const result = await this.store.mergePlaces(
        targetId,
        this.sourceIds(targetId)
      );

      this.merged.emit(result);
      this.dialog().nativeElement.close();
    } catch (error) {
      this.error.set(
        this.translateMessage(
          error instanceof Error ? error.message : 'places.errors.merge'
        )
      );
    }
  }

  protected onDialogClosed(): void {
    this.closed.emit();
  }

  private sourceIds(targetId: string): string[] {
    return this.places()
      .map((place) => place.id)
      .filter((id) => id !== targetId);
  }

  private translateMessage(text: string): string {
    return text.startsWith('places.') ? this.transloco.translate(text) : text;
  }
}

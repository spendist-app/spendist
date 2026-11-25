import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@ngneat/transloco';
import { LogoComponent } from './logo.component';
import { LogoPickerComponent } from './logo-picker.component';
import { LogoService } from './logo.service';
import { type LogoDraft, emptyLogoDraft } from './logo';

/**
 * Form field for a record's logo: shows the current choice and opens the
 * picker. Picked images stay in the browser until the form is saved.
 */
@Component({
  standalone: true,
  selector: 'app-logo-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, LogoComponent, LogoPickerComponent],
  template: `
    <div class="flex flex-wrap items-center gap-3" data-testid="logo-field">
      <span class="text-sm font-medium">{{
        'logos.field.label' | transloco
      }}</span>
      @if (hasLogo()) {
      <app-logo
        [logo]="draft().value"
        [previewUrl]="draft().pending?.previewUrl ?? null"
        size="md"
      />
      }
      <button
        type="button"
        class="btn btn-sm btn-outline"
        data-testid="logo-field-choose"
        (click)="pickerOpen.set(true)"
      >
        {{
          (hasLogo() ? 'logos.field.change' : 'logos.field.choose') | transloco
        }}
      </button>
      @if (hasLogo()) {
      <button
        type="button"
        class="btn btn-sm btn-ghost"
        data-testid="logo-field-remove"
        (click)="remove()"
      >
        {{ 'logos.field.remove' | transloco }}
      </button>
      }
    </div>

    @if (pickerOpen()) {
    <app-logo-picker
      [initialQuery]="name()"
      (picked)="choose($event)"
      (closed)="pickerOpen.set(false)"
    />
    }
  `,
})
export class LogoFieldComponent {
  readonly draft = model<LogoDraft>(emptyLogoDraft());
  /** Name of the record, used as the first search. */
  readonly name = input('');

  private readonly logos = inject(LogoService);
  protected readonly pickerOpen = signal(false);

  protected readonly hasLogo = computed(
    () => !!this.draft().pending || !!this.draft().value
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.logos.releasePending(this.draft().pending);
    });
  }

  protected choose(draft: LogoDraft): void {
    this.logos.releasePending(this.draft().pending);
    this.draft.set(draft);
  }

  protected remove(): void {
    this.choose(emptyLogoDraft());
  }
}

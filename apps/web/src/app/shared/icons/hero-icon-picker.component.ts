import { ChangeDetectionStrategy, Component, computed, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { TranslocoPipe } from '@ngneat/transloco';
import { NgIcon } from '@ng-icons/core';
import {
  canonicalHeroIconName,
  formatHeroIconLabel,
  heroIconOptions,
  heroIconSvg,
  isHeroIconName,
} from './heroicons';

@Component({
  standalone: true,
  selector: 'app-hero-icon-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslocoPipe],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => HeroIconPickerComponent),
      multi: true,
    },
  ],
  template: `
    <label class="form-control w-full gap-3">
      <span class="label-text text-sm font-semibold text-base-content">
        {{ label() }}
      </span>

      <div class="flex items-center gap-3 rounded-xl border border-base-300 bg-base-200/40 px-3 py-2">
        @if (value(); as selectedIcon) {
          @if (selectedIcon.length > 0) {
            @if (heroIconSvg(selectedIcon); as svg) {
              <ng-icon [svg]="svg" size="24" aria-hidden="true"></ng-icon>
            }
            <span class="text-sm font-medium text-base-content">
              {{ isHeroIconName(selectedIcon) ? formatHeroIconLabel(selectedIcon) : selectedIcon }}
            </span>
          } @else {
            <span class="text-sm text-base-content/60">
              {{ 'common.iconPicker.none' | transloco }}
            </span>
          }
        } @else {
          <span class="text-sm text-base-content/60">
            {{ 'common.iconPicker.none' | transloco }}
          </span>
        }

        <span class="grow"></span>

        <button
          type="button"
          class="btn btn-ghost btn-xs"
          (click)="clear()"
          [disabled]="disabled() || value() === ''"
        >
          {{ 'common.iconPicker.clear' | transloco }}
        </button>
      </div>

      <input
        type="search"
        class="input input-bordered input-sm w-full"
        [attr.placeholder]="searchPlaceholder() ?? ('common.iconPicker.searchPlaceholder' | transloco)"
        [value]="search()"
        (input)="onSearch($event)"
        (blur)="markTouched()"
        [disabled]="disabled()"
      />

      <div class="mt-2 grid max-h-64 grid-cols-[repeat(auto-fit,minmax(4.5rem,1fr))] gap-3 overflow-y-auto">
        @if (allowNone()) {
          <button
            type="button"
            class="relative flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-base-300 bg-base-100/70 p-4 transition hover:bg-base-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
            [class.border-primary]="value() === ''"
            [class.bg-primary/10]="value() === ''"
            (click)="select('')"
            [attr.title]="'common.iconPicker.none' | transloco"
            [attr.aria-label]="'common.iconPicker.none' | transloco"
            [disabled]="disabled()"
          >
            <span class="sr-only">{{ 'common.iconPicker.none' | transloco }}</span>
            <span class="block h-6 w-6">
              <span class="block h-full w-full rounded-full border border-base-300 bg-base-200/80"></span>
            </span>
          </button>
        }

        @for (option of filteredOptions(); track option.name) {
          <button
            type="button"
            class="relative flex aspect-square w-full items-center justify-center rounded-xl border border-base-300 bg-base-100/70 p-4 transition hover:bg-base-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
            [class.border-primary]="option.name === value()"
            [class.bg-primary/10]="option.name === value()"
            (click)="select(option.name)"
            [attr.title]="option.label"
            [attr.aria-label]="option.label"
            [disabled]="disabled()"
          >
            @if (heroIconSvg(option.name); as svg) {
              <ng-icon [svg]="svg" size="32" aria-hidden="true"></ng-icon>
            }
            <span class="sr-only">{{ option.label }}</span>
          </button>
        }
      </div>

      @if (filteredOptions().length === 0) {
        <div class="rounded-lg border border-dashed border-base-300 bg-base-100/70 px-3 py-4 text-center text-xs text-base-content/70">
          {{ 'common.iconPicker.noResults' | transloco: { query: search() } }}
        </div>
      }

      @if (customValue(); as fallback) {
        <div class="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          {{ 'common.iconPicker.customInfo' | transloco: { icon: fallback } }}
        </div>
      }
    </label>
  `,
})
export class HeroIconPickerComponent implements ControlValueAccessor {
  readonly label = input('Heroicon');
  readonly allowNone = input(true);
  readonly searchPlaceholder = input<string | null>(null);

  protected readonly heroIconSvg = heroIconSvg;
  protected readonly isHeroIconName = isHeroIconName;
  protected readonly formatHeroIconLabel = formatHeroIconLabel;

  protected readonly value = signal<string>('');
  protected readonly disabled = signal(false);
  protected readonly search = signal('');

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private touched = false;

  protected readonly filteredOptions = computed(() => {
    const term = this.search().trim().toLowerCase();
    const options = heroIconOptions;

    if (!term) {
      return options;
    }

    return options.filter((option) => {
      const label = option.label.toLowerCase();
      const name = option.name.toLowerCase();
      return label.includes(term) || name.includes(term);
    });
  });

  protected readonly customValue = computed(() => {
    const current = this.value();
    if (!current) {
      return '';
    }

    return isHeroIconName(current) ? '' : current;
  });

  writeValue(value: string | null): void {
    this.value.set(this.normalizeValue(value));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected select(raw: string): void {
    if (this.disabled()) {
      return;
    }

    const next = this.normalizeValue(raw);
    this.value.set(next);
    this.onChange(next);
    this.markTouched();
  }

  protected clear(): void {
    if (this.disabled()) {
      return;
    }

    this.select('');
  }

  protected onSearch(event: Event): void {
    const inputElement = event.target as HTMLInputElement | null;
    this.search.set(inputElement?.value ?? '');
  }

  protected markTouched(): void {
    if (this.touched) {
      return;
    }

    this.onTouched();
    this.touched = true;
  }

  private normalizeValue(value: string | null | undefined): string {
    const canonical = canonicalHeroIconName(value);
    if (canonical) {
      return canonical;
    }

    const trimmed = value?.trim() ?? '';
    return trimmed;
  }
}

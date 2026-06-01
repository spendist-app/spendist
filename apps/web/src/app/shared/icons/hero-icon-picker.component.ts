import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { TranslocoPipe } from '@ngneat/transloco';
import { NgIcon } from '@ng-icons/core';
import {
  canonicalHeroIconName,
  formatHeroIconLabel,
  heroIconOptions,
  heroIconSvg,
  isHeroIconName,
} from './heroicons';

const noopChange = (value: string): void => {
  void value;
};

const noopTouched = (): void => {
  return;
};

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
  templateUrl: './hero-icon-picker.component.html',
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

  private onChange: (value: string) => void = noopChange;
  private onTouched: () => void = noopTouched;
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

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  forwardRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';

export interface CategorySelectGroup {
  readonly groupName: string | null;
  readonly options: readonly CategorySelectOption[];
}

export interface CategorySelectOption {
  readonly id: string;
  readonly label: string;
  readonly groupName?: string | null;
}

const noopChange = (value: string): void => {
  void value;
};

const noopTouched = (): void => {
  return;
};

@Component({
  standalone: true,
  selector: 'app-category-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CategorySelectComponent),
      multi: true,
    },
  ],
  templateUrl: './category-select.component.html',
})
export class CategorySelectComponent implements ControlValueAccessor {
  readonly groups = input<readonly CategorySelectGroup[]>([]);
  readonly label = input('');
  readonly placeholder = input('');
  readonly searchPlaceholder = input('');
  readonly emptyLabel = input('');
  readonly opened = output<void>();

  protected readonly searchInput =
    viewChild<ElementRef<HTMLInputElement>>('searchInput');
  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly open = signal(false);
  protected readonly search = signal('');

  private onChange: (value: string) => void = noopChange;
  private onTouched: () => void = noopTouched;

  protected readonly selectedLabel = computed(() => {
    const selected = this.value();
    if (!selected) {
      return '';
    }

    for (const group of this.groups()) {
      const option = group.options.find((item) => item.id === selected);
      if (option) {
        return option.label;
      }
    }

    return '';
  });

  protected readonly filteredGroups = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) {
      return this.groups();
    }

    return this.groups()
      .map((group) => ({
        groupName: group.groupName,
        options: group.options.filter((option) =>
          [option.label, option.groupName ?? group.groupName ?? ''].some(
            (value) => value.toLowerCase().includes(query)
          )
        ),
      }))
      .filter((group) => group.options.length > 0);
  });

  writeValue(value: string | null | undefined): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled) {
      this.closeDropdown();
    }
  }

  protected toggleDropdown(): void {
    if (this.disabled()) {
      return;
    }

    if (this.open()) {
      this.closeDropdown();
      return;
    }

    this.search.set('');
    this.open.set(true);
    this.opened.emit();
    this.focusSearch();
  }

  protected closeDropdown(): void {
    this.open.set(false);
    this.search.set('');
  }

  protected onSearchInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement | null;
    this.search.set(inputElement?.value ?? '');
  }

  protected select(categoryId: string): void {
    if (this.disabled()) {
      return;
    }

    this.value.set(categoryId);
    this.onChange(categoryId);
    this.markTouched();
    this.closeDropdown();
  }

  protected onFocusOut(event: FocusEvent): void {
    const nextTarget = event.relatedTarget as Node | null;
    const currentTarget = event.currentTarget as HTMLElement | null;
    if (!currentTarget || !nextTarget || !currentTarget.contains(nextTarget)) {
      this.closeDropdown();
      this.markTouched();
    }
  }

  protected markTouched(): void {
    this.onTouched();
  }

  private focusSearch(): void {
    setTimeout(() => {
      this.searchInput()?.nativeElement.focus();
    }, 0);
  }
}

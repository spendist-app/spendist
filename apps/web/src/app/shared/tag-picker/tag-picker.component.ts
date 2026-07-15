import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@ngneat/transloco';

export interface TagPickerTag {
  readonly id: string;
  readonly name: string;
  readonly color: string | null;
}

export interface TagPickerSelection {
  readonly id: string | null;
  readonly name: string;
}

@Component({
  standalone: true,
  selector: 'app-tag-picker',
  imports: [TranslocoPipe],
  templateUrl: './tag-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagPickerComponent implements OnDestroy {
  private static readonly RECENT_TAG_LIMIT = 7;

  readonly tags = input<readonly TagPickerTag[]>([]);
  readonly value = input<readonly TagPickerSelection[]>([]);
  readonly recentTags = input<readonly TagPickerTag[]>([]);
  readonly valueChange = output<readonly TagPickerSelection[]>();

  protected readonly tagInput = signal('');
  protected readonly showSuggestions = signal(false);
  protected readonly highlightedSuggestion = signal(-1);
  private suggestionBlurTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly suggestedTags = computed(() => {
    const query = this.tagInput().trim().toLowerCase();
    const selectedIds = new Set(
      this.value()
        .map((selection) => selection.id)
        .filter((id): id is string => Boolean(id))
    );
    const selectedNames = new Set(
      this.value().map((selection) => selection.name.toLowerCase())
    );

    return this.tags()
      .filter(
        (tag) =>
          !selectedIds.has(tag.id) &&
          !selectedNames.has(tag.name.toLowerCase()) &&
          (!query || tag.name.toLowerCase().includes(query))
      )
      .slice(0, 8);
  });

  protected readonly visibleRecentTags = computed(() => {
    const selectedIds = new Set(
      this.value()
        .map((selection) => selection.id)
        .filter((id): id is string => Boolean(id))
    );
    const selectedNames = new Set(
      this.value().map((selection) => selection.name.toLowerCase())
    );

    return this.recentTags()
      .filter(
        (tag) =>
          !selectedIds.has(tag.id) && !selectedNames.has(tag.name.toLowerCase())
      )
      .slice(0, TagPickerComponent.RECENT_TAG_LIMIT);
  });

  protected readonly suggestionPanelOpen = computed(
    () => this.showSuggestions() && this.suggestedTags().length > 0
  );

  protected onTagInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.tagInput.set(input?.value ?? '');
    this.showSuggestions.set(true);
    this.highlightedSuggestion.set(-1);
    this.clearSuggestionTimer();
  }

  protected onTagInputFocus(): void {
    this.clearSuggestionTimer();
    if (this.suggestedTags().length > 0) {
      this.showSuggestions.set(true);
      this.highlightedSuggestion.set(-1);
    }
  }

  protected onTagInputBlur(): void {
    this.clearSuggestionTimer();
    this.suggestionBlurTimer = setTimeout(() => {
      this.closeSuggestionList();
    }, 120);
  }

  protected onTagInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveSuggestionHighlight(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveSuggestionHighlight(-1);
      return;
    }

    if (event.key === 'Escape') {
      this.closeSuggestionList();
      return;
    }

    if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
      if (
        event.key !== 'Tab' ||
        this.tagInput().trim() ||
        this.highlightedSuggestion() >= 0
      ) {
        event.preventDefault();
        this.commitTagInput();
      }
      return;
    }

    if (event.key === 'Backspace' && !this.tagInput()) {
      this.removeLastTag();
    }
  }

  protected addExistingTag(tag: TagPickerTag): void {
    this.clearSuggestionTimer();
    this.addTagSelection({ id: tag.id, name: tag.name });
  }

  protected removeTag(selection: TagPickerSelection): void {
    this.valueChange.emit(
      this.value().filter(
        (item) => !(item.id === selection.id && item.name === selection.name)
      )
    );
  }

  protected clearTags(): void {
    this.valueChange.emit([]);
    this.tagInput.set('');
    this.closeSuggestionList();
  }

  protected trackTagSelection(
    _index: number,
    selection: TagPickerSelection
  ): string {
    return selection.id ?? `new-${selection.name.toLowerCase()}`;
  }

  protected onSuggestionClick(
    event: MouseEvent,
    suggestion: TagPickerTag
  ): void {
    event.preventDefault();
    this.addExistingTag(suggestion);
  }

  protected onSuggestionHover(index: number): void {
    this.highlightedSuggestion.set(index);
  }

  ngOnDestroy(): void {
    this.clearSuggestionTimer();
  }

  private commitTagInput(): void {
    const suggestions = this.suggestedTags();
    const highlighted = this.highlightedSuggestion();
    if (highlighted >= 0 && highlighted < suggestions.length) {
      this.addExistingTag(suggestions[highlighted]);
      return;
    }

    const value = this.sanitizeTagName(this.tagInput());
    if (!value) {
      this.closeSuggestionList();
      return;
    }

    const existing = this.tags().find(
      (tag) => tag.name.toLowerCase() === value.toLowerCase()
    );
    this.addTagSelection(
      existing
        ? { id: existing.id, name: existing.name }
        : { id: null, name: value }
    );
  }

  private addTagSelection(selection: TagPickerSelection): void {
    const duplicate = this.value().some((item) =>
      selection.id && item.id
        ? item.id === selection.id
        : item.name.toLowerCase() === selection.name.toLowerCase()
    );
    if (duplicate) {
      return;
    }

    this.valueChange.emit([...this.value(), selection]);
    this.tagInput.set('');
    this.closeSuggestionList();
  }

  private removeLastTag(): void {
    if (this.value().length === 0) {
      return;
    }
    this.valueChange.emit(this.value().slice(0, -1));
  }

  private moveSuggestionHighlight(direction: 1 | -1): void {
    const suggestions = this.suggestedTags();
    if (suggestions.length === 0) {
      this.closeSuggestionList();
      return;
    }

    this.showSuggestions.set(true);
    this.clearSuggestionTimer();
    const current = this.highlightedSuggestion();
    this.highlightedSuggestion.set(
      current < 0
        ? direction > 0
          ? 0
          : suggestions.length - 1
        : (current + direction + suggestions.length) % suggestions.length
    );
  }

  private closeSuggestionList(): void {
    this.clearSuggestionTimer();
    this.showSuggestions.set(false);
    this.highlightedSuggestion.set(-1);
  }

  private clearSuggestionTimer(): void {
    if (this.suggestionBlurTimer !== null) {
      clearTimeout(this.suggestionBlurTimer);
      this.suggestionBlurTimer = null;
    }
  }

  private sanitizeTagName(value: string): string | null {
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (!normalized) {
      return null;
    }
    return normalized.slice(0, 60);
  }
}

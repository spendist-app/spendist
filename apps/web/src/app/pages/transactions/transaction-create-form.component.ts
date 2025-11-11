import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  computed,
  OutputEmitterRef,
  output,
  input,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@ngneat/transloco';
import {
  TransactionsStore,
  CreateTransactionPayload,
  TagEntity,
  WalletEntity,
  TransactionViewModel,
  UpdateTransactionPayload,
} from './transactions.store';
import type { TransactionDirection } from '@spendist/data-access/supabase-types';
import { parseAmountInput } from './transaction-amount.parser';

interface CategoryOption {
  readonly id: string;
  readonly label: string;
  readonly groupName: string | null;
}

interface TagSelection {
  readonly id: string | null;
  readonly name: string;
}

interface CurrencyOptionView {
  readonly id: number;
  readonly symbol: string;
}

@Component({
  standalone: true,
  selector: 'app-transaction-create-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './transaction-create-form.component.html',
})
export class TransactionCreateFormComponent {
  private static readonly MAX_QUANTITY = 50;

  private readonly formBuilder = inject(FormBuilder);
  protected readonly store = inject(TransactionsStore);
  private readonly host = inject(ElementRef<HTMLElement>);
  private suggestionBlurTimer: ReturnType<typeof setTimeout> | null = null;

  readonly mode = input<'create' | 'edit'>('create');
  readonly transaction = input<TransactionViewModel | null>(null);
  readonly prefill = input<TransactionViewModel | null | undefined>(undefined);
  protected readonly showAdvanced = signal(false);
  protected readonly isEditMode = computed(() => this.mode() === 'edit');
  protected readonly tags = computed<readonly TagEntity[]>(() => this.store.tags());
  protected readonly wallets = computed<readonly WalletEntity[]>(() => this.store.wallets());
  private readonly selectedWalletCurrency = signal(this.store.defaultCurrency());
  protected readonly walletCurrency = computed(() => this.selectedWalletCurrency());
  protected readonly categoryView = computed(() => this.buildCategoryView());
  protected readonly currencyOptions = computed<readonly CurrencyOptionView[]>(() => [
    { id: -1, symbol: this.walletCurrency() },
  ]);

  protected readonly form = this.formBuilder.group({
    description: this.formBuilder.control<string>('', {
      validators: [Validators.maxLength(120)],
      nonNullable: true,
    }),
    categoryId: this.formBuilder.control<string>('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    occurredOn: this.formBuilder.control<string>(this.todayIsoString(), {
      validators: [Validators.required],
      nonNullable: true,
    }),
    amount: this.formBuilder.control<string>('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    currency: this.formBuilder.control<string>(this.store.defaultCurrency(), {
      validators: [Validators.required],
      nonNullable: true,
    }),
    direction: this.formBuilder.control<TransactionDirection>('expense', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    quantity: this.formBuilder.control<number>(1, {
      validators: [Validators.required, Validators.min(1), Validators.max(TransactionCreateFormComponent.MAX_QUANTITY)],
      nonNullable: true,
    }),
    tags: this.formBuilder.control<TagSelection[]>([], {
      nonNullable: true,
    }),
    foreignAmount: this.formBuilder.control<string>(''),
    walletId: this.formBuilder.control<string>('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  protected readonly controls = this.form.controls;
  readonly closed: OutputEmitterRef<void> = output();
  readonly saved: OutputEmitterRef<void> = output();

  constructor() {
    effect(() => {
      const mode = this.mode();
      const editTransaction = this.transaction();
      const prefill = this.prefill();

      if (mode === 'edit') {
        if (editTransaction) {
          this.populateFormForEdit(editTransaction);
        }
        return;
      }

      if (prefill) {
        this.populateFormForCreatePrefill(prefill);
        return;
      }

      this.resetForm();
    });

    effect(() => {
      if (this.isEditMode() || this.prefill()) {
        return;
      }

      const categories = this.store.categories();
      const current = this.form.controls.categoryId.value;
      if (!current && categories.length > 0) {
        this.form.controls.categoryId.setValue(categories[0].id);
      }
    });

    effect(() => {
      const wallets = this.wallets();
      const walletControl = this.form.controls.walletId;
      const mode = this.mode();
      const transaction = this.transaction();
      const prefill = this.prefill();

      if (wallets.length === 0) {
        if (walletControl.value !== '') {
          walletControl.setValue('', { emitEvent: false });
          walletControl.markAsPristine();
        }
        this.syncWalletCurrency(null);
        return;
      }

      let desiredWallet: WalletEntity | undefined;

      if (mode === 'edit' && transaction) {
        desiredWallet = wallets.find((wallet) => wallet.id === transaction.walletId);
      } else if (prefill) {
        desiredWallet = wallets.find((wallet) => wallet.id === prefill.walletId);
      } else if (walletControl.value) {
        desiredWallet = wallets.find((wallet) => wallet.id === walletControl.value);
      }

      if (!desiredWallet) {
        const preferredId = this.store.defaultWalletId();
        desiredWallet =
          wallets.find((wallet) => wallet.id === preferredId) ??
          wallets.find((wallet) => wallet.isDefault) ??
          wallets[0];
      }

      if (!desiredWallet) {
        return;
      }

      if (walletControl.value !== desiredWallet.id) {
        walletControl.setValue(desiredWallet.id, { emitEvent: false });
        walletControl.markAsPristine();
      }

      this.syncWalletCurrency(desiredWallet.id);
    });

    effect(() => {
      const desiredCurrency = this.walletCurrency();
      const control = this.form.controls.currency;

      if (control.value !== desiredCurrency) {
        control.setValue(desiredCurrency, { emitEvent: false });
        control.markAsPristine();
        this.syncAmountInDefault();
      }
    });

    effect(() => {
      if (this.showAdvanced()) {
        const input = this.host.nativeElement.querySelector('[formControlName="foreignAmount"]') as
          | HTMLInputElement
          | null;
        input?.focus();
      }
    });

    effect(() => {
      const suggestions = this.suggestedTags();
      if (suggestions.length === 0) {
        this.highlightedSuggestion.set(-1);
        return;
      }

      const current = this.highlightedSuggestion();
      if (current >= suggestions.length) {
        this.highlightedSuggestion.set(-1);
      }
    });

    this.form.controls.amount.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.syncAmountInDefault();
    });

    this.form.controls.currency.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.syncAmountInDefault();
    });

    this.form.controls.walletId.valueChanges.pipe(takeUntilDestroyed()).subscribe((walletId) => {
      this.syncWalletCurrency(typeof walletId === 'string' ? walletId : null);
    });

    this.syncWalletCurrency(typeof this.form.controls.walletId.value === 'string' ? this.form.controls.walletId.value : null);
  }

  protected clearTags(): void {
    this.form.controls.tags.setValue([] as TagSelection[]);
    this.tagInput.set('');
    this.closeSuggestionList();
  }

  protected readonly tagInput = signal('');
  protected readonly showSuggestions = signal(false);
  protected readonly highlightedSuggestion = signal(-1);
  protected readonly suggestedTags = computed(() => {
    const query = this.tagInput().trim().toLowerCase();
    const selections = this.form.controls.tags.value;
    const selectedIds = new Set(selections.filter((selection) => selection.id).map((selection) => selection.id as string));
    const selectedNames = new Set(selections.map((selection) => selection.name.toLowerCase()));

    return this.tags()
      .filter((tag) => {
        if (selectedIds.has(tag.id)) {
          return false;
        }

        if (selectedNames.has(tag.name.toLowerCase())) {
          return false;
        }

        if (!query) {
          return true;
        }

      return tag.name.toLowerCase().includes(query);
    })
    .slice(0, 8);
  });
  protected readonly suggestionPanelOpen = computed(
    () => this.showSuggestions() && this.suggestedTags().length > 0,
  );

  protected onTagInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const value = input?.value ?? '';
    this.tagInput.set(value);
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
      if (event.key !== 'Tab' || this.tagInput().trim() || this.highlightedSuggestion() >= 0) {
        event.preventDefault();
        this.commitTagInput();
      }
      return;
    }

    if (event.key === 'Backspace' && !this.tagInput()) {
      this.removeLastTag();
    }
  }

  protected addExistingTag(tag: TagEntity): void {
    this.clearSuggestionTimer();
    this.addTagSelection({ id: tag.id, name: tag.name });
  }

  protected removeTag(selection: TagSelection): void {
    const updated = this.form.controls.tags.value.filter((item) => !(item.id === selection.id && item.name === selection.name));
    this.form.controls.tags.setValue(updated as TagSelection[]);
  }

  protected trackTagSelection(_index: number, selection: TagSelection): string {
    return selection.id ?? `new-${selection.name.toLowerCase()}`;
  }

  protected onSuggestionClick(event: MouseEvent, suggestion: TagEntity): void {
    event.preventDefault();
    this.addExistingTag(suggestion);
  }

  protected onSuggestionHover(index: number): void {
    this.highlightedSuggestion.set(index);
  }

  private commitTagInput(): void {
    const suggestions = this.suggestedTags();
    const highlighted = this.highlightedSuggestion();
    if (highlighted >= 0 && highlighted < suggestions.length) {
      this.addExistingTag(suggestions[highlighted]);
      return;
    }

    const value = this.tagInput().trim();
    if (!value) {
      this.closeSuggestionList();
      return;
    }

    this.addTagByName(value);
  }

  private addTagByName(name: string): void {
    const normalized = this.sanitizeTagName(name);
    if (!normalized) {
      return;
    }

    const existingTag = this.tags().find((tag) => tag.name.toLowerCase() === normalized.toLowerCase());
    if (existingTag) {
      this.addTagSelection({ id: existingTag.id, name: existingTag.name });
      return;
    }

    this.addTagSelection({ id: null, name: normalized });
  }

  private addTagSelection(selection: TagSelection): void {
    const selections = this.form.controls.tags.value;
    const duplicate = selections.some((item) => {
      if (selection.id && item.id) {
        return item.id === selection.id;
      }

      return item.name.toLowerCase() === selection.name.toLowerCase();
    });

    if (duplicate) {
      return;
    }

    this.form.controls.tags.setValue([...selections, selection] as TagSelection[]);
    this.tagInput.set('');
    this.closeSuggestionList();
  }

  private removeLastTag(): void {
    const selections = this.form.controls.tags.value;
    if (selections.length === 0) {
      return;
    }

    this.form.controls.tags.setValue(selections.slice(0, -1) as TagSelection[]);
  }

  private moveSuggestionHighlight(direction: 1 | -1): void {
    const suggestions = this.suggestedTags();
    if (suggestions.length === 0) {
      this.closeSuggestionList();
      return;
    }

    this.showSuggestions.set(true);
    this.clearSuggestionTimer();

    let index = this.highlightedSuggestion();
    if (index < 0) {
      index = direction > 0 ? 0 : suggestions.length - 1;
    } else {
      index = (index + direction + suggestions.length) % suggestions.length;
    }

    this.highlightedSuggestion.set(index);
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

  protected toggleAdvanced(): void {
    this.showAdvanced.update((value) => !value);
  }

  protected selectDirection(direction: TransactionDirection): void {
    this.form.controls.direction.setValue(direction);
  }

  protected onClose(): void {
    this.resetForm();
    this.closed.emit();
  }

  protected async submit(): Promise<void> {
    if (this.store.transactionMutationPending()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const mode = this.mode();
    const raw = this.form.getRawValue();
    const amount = parseAmountInput(raw.amount);
    if (amount === null) {
      this.form.controls.amount.setErrors({ invalid: true });
      return;
    }

    const occurredAt = this.parseDate(raw.occurredOn);
    if (!occurredAt) {
      this.form.controls.occurredOn.setErrors({ invalid: true });
      return;
    }

    const quantity = mode === 'create' ? this.clampQuantity(raw.quantity ?? 1) : 1;
    if (mode === 'create') {
      this.form.controls.quantity.setValue(quantity);
    }

    const tagSelections = this.form.controls.tags.value;
    const newTagNames = Array.from(
      new Set(
        tagSelections
          .filter((selection) => !selection.id)
          .map((selection) => this.sanitizeTagName(selection.name))
          .filter((name): name is string => !!name),
      ),
    );

    if (newTagNames.length > 0) {
      const createdTags = await this.store.ensureTags(newTagNames);
      this.replaceNewTagsWithIds(createdTags);
    }

    const finalTagIds = this.form.controls.tags.value
      .map((selection) => selection.id)
      .filter((id): id is string => !!id);

    const walletId = raw.walletId.trim();
    if (!walletId) {
      this.form.controls.walletId.setErrors({ required: true });
      return;
    }
    const defaultCurrency = this.walletCurrency().toUpperCase();
    const currencyInput = (raw.currency ?? '').toUpperCase().trim();
    const currency = /^[A-Z]{3}$/.test(currencyInput) ? currencyInput : defaultCurrency;
    const amountInDefault = raw.foreignAmount ? parseAmountInput(raw.foreignAmount) : null;
    const basePayload: UpdateTransactionPayload = {
      description: raw.description?.trim() ? raw.description.trim() : null,
      categoryId: raw.categoryId,
      occurredAt,
      amount,
      currency,
      direction: raw.direction,
      tagIds: Array.from(new Set(finalTagIds)),
      foreignAmount: amountInDefault,
      foreignCurrency: amountInDefault ? defaultCurrency : null,
      walletId,
    };

    if (mode === 'create') {
      const result = await this.store.createTransactions({
        ...basePayload,
        quantity,
      });

      if (result.success) {
        this.saved.emit();
        this.onClose();
      }
      return;
    }

    const transaction = this.transaction();
    if (!transaction) {
      return;
    }

    const updateResult = await this.store.updateTransaction(transaction.id, basePayload);
    if (updateResult.success) {
      this.saved.emit();
      this.onClose();
    }
  }

  private resetForm(): void {
    const defaultCategory = this.store.categories()[0]?.id ?? '';
    this.form.reset({
      description: '',
      categoryId: defaultCategory,
      occurredOn: this.todayIsoString(),
      amount: '',
      currency: this.store.defaultCurrency(),
      direction: 'expense',
      quantity: 1,
      tags: [] as TagSelection[],
      foreignAmount: '',
      walletId: this.store.defaultWalletId() ?? '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.showAdvanced.set(false);
    this.store.dismissMutationError();
    this.tagInput.set('');
    this.syncWalletCurrency(this.form.controls.walletId.value);
    this.syncAmountInDefault();
  }

  private populateFormForEdit(transaction: TransactionViewModel): void {
    this.form.reset({
      description: transaction.description ?? '',
      categoryId: transaction.categoryId,
      occurredOn: this.toDateInput(transaction.occurredAt),
      amount: transaction.amount.toFixed(2),
      currency: transaction.currency,
      direction: transaction.direction,
      quantity: 1,
      tags: this.mapTagIdsToSelections(transaction.tagIds),
      foreignAmount: this.formatAmountInDefault(transaction),
      walletId: transaction.walletId,
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.showAdvanced.set(false);
    this.store.dismissMutationError();
    this.tagInput.set('');
    this.syncWalletCurrency(transaction.walletId);
    this.syncAmountInDefault();
  }

  private populateFormForCreatePrefill(transaction: TransactionViewModel): void {
    this.form.reset({
      description: transaction.description ?? '',
      categoryId: transaction.categoryId,
      occurredOn: this.toDateInput(transaction.occurredAt),
      amount: transaction.amount.toFixed(2),
      currency: transaction.currency,
      direction: transaction.direction,
      quantity: 1,
      tags: this.mapTagIdsToSelections(transaction.tagIds),
      foreignAmount: this.formatAmountInDefault(transaction),
      walletId: transaction.walletId,
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.showAdvanced.set(false);
    this.store.dismissMutationError();
    this.tagInput.set('');
    this.syncWalletCurrency(transaction.walletId);
    this.syncAmountInDefault();
  }

  private todayIsoString(): string {
    return this.toDateInput(new Date());
  }

  private toDateInput(date: Date): string {
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private sanitizeTagName(name: string | null | undefined): string | null {
    if (!name) {
      return null;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      return null;
    }

    return trimmed.length > 60 ? trimmed.slice(0, 60) : trimmed;
  }

  private replaceNewTagsWithIds(tags: readonly TagEntity[]): void {
    if (tags.length === 0) {
      this.closeSuggestionList();
      return;
    }

    const lookup = new Map(this.store.tags().map((tag) => [tag.name.toLowerCase(), tag]));
    const updated = this.form.controls.tags.value.map((selection) => {
      if (selection.id) {
        return selection;
      }

      const match = lookup.get(selection.name.toLowerCase());
      return match ? { id: match.id, name: match.name } : selection;
    });

    this.form.controls.tags.setValue(updated as TagSelection[]);
    this.closeSuggestionList();
    this.tagInput.set('');
  }

  private mapTagIdsToSelections(ids: readonly string[]): TagSelection[] {
    const tagLookup = new Map(this.store.tags().map((tag) => [tag.id, tag]));
    return ids.map((id) => {
      const tag = tagLookup.get(id);
      return tag ? { id: tag.id, name: tag.name } : { id, name: id };
    });
  }

  private formatAmountInDefault(transaction: TransactionViewModel): string {
    const amount = transaction.amountInDefault;
    if (!Number.isFinite(amount) || amount === transaction.amount) {
      return '';
    }

    return amount.toFixed(2);
  }

  private syncWalletCurrency(walletId: string | null | undefined): void {
    const wallets = this.wallets();
    const wallet = walletId ? wallets.find((item) => item.id === walletId) ?? null : null;
    const currency = wallet?.currency ?? this.store.defaultCurrency();
    this.selectedWalletCurrency.set(currency);

    const currencyControl = this.form.controls.currency;
    if (currencyControl.value !== currency) {
      currencyControl.setValue(currency, { emitEvent: false });
      currencyControl.markAsPristine();
    }
  }

  private calculateExchangeRate(sourceCurrency: string, targetCurrency: string): number | null {
    if (!sourceCurrency || !targetCurrency) {
      return null;
    }

    if (sourceCurrency === targetCurrency) {
      return 1;
    }

    // TODO: Replace stub implementation with a real FX lookup.
    return 1;
  }

  private syncAmountInDefault(): void {
    const amountControl = this.form.controls.amount;
    const currencyControl = this.form.controls.currency;
    const defaultAmountControl = this.form.controls.foreignAmount;

    const amount = parseAmountInput(amountControl.value);
    if (amount === null) {
      defaultAmountControl.setValue('', { emitEvent: false });
      return;
    }

    const currency = (currencyControl.value ?? '').toUpperCase();
    const defaultCurrency = this.walletCurrency().toUpperCase();
    const rate = this.calculateExchangeRate(currency || defaultCurrency, defaultCurrency);

    if (rate === null) {
      return;
    }

    const defaultAmount = amount * rate;
    defaultAmountControl.setValue(defaultAmount.toFixed(2), { emitEvent: false });
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map((segment) => Number(segment));
    if (!year || !month || !day) {
      return null;
    }

    const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private clampQuantity(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
      return 1;
    }

    return Math.min(Math.floor(value), TransactionCreateFormComponent.MAX_QUANTITY);
  }

  private buildCategoryView(): readonly { groupName: string | null; options: readonly CategoryOption[] }[] {
    const grouped = this.store.groupedCategories();
    const ungrouped = this.store.ungroupedCategories();

    const groupedView = grouped.map((group) => ({
      groupName: group.name,
      options: group.categories.map((category) => ({
        id: category.id,
        label: category.name,
        groupName: group.name,
      })),
    }));

    const ungroupedView =
      ungrouped.length > 0
        ? [
            {
              groupName: null,
              options: ungrouped.map((category) => ({
                id: category.id,
                label: category.name,
                groupName: null,
              })),
            },
          ]
        : [];

    return [...groupedView, ...ungroupedView];
  }
}

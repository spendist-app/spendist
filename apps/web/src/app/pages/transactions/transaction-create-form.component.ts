import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  signal,
  computed,
  OutputEmitterRef,
  output,
  input,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@ngneat/transloco';
import { NgIcon } from '@ng-icons/core';
import {
  TransactionsStore,
  TagEntity,
  WalletEntity,
  PlaceEntity,
  TransactionViewModel,
  UpdateTransactionPayload,
} from './transactions.store';
import type { TransactionDirection } from '@spendist/data-access/supabase-types';
import { parseAmountInput } from './transaction-amount.parser';
import { heroIconSvg } from '../../shared/icons/heroicons';
import { logError } from '../../core/logger';
import {
  CategorySelectComponent,
  CategorySelectOption,
} from '../../shared/category-select/category-select.component';
import {
  TagPickerComponent,
  TagPickerSelection,
} from '../../shared/tag-picker/tag-picker.component';

interface CurrencyOptionView {
  readonly id: number;
  readonly symbol: string;
}

export type TransactionFormSaveResult = 'created' | 'updated';

@Component({
  standalone: true,
  selector: 'app-transaction-create-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    NgIcon,
    CategorySelectComponent,
    TagPickerComponent,
  ],
  templateUrl: './transaction-create-form.component.html',
})
export class TransactionCreateFormComponent {
  private static readonly RECENT_TAG_LIMIT = 7;
  private static readonly MAX_QUANTITY = 50;
  private static readonly RECENT_DEFAULTS_STORAGE_KEY =
    'spendist.transactionForm.recentDefaults';
  protected readonly closeIcon = heroIconSvg('heroXMark');

  private readonly formBuilder = inject(FormBuilder);
  protected readonly store = inject(TransactionsStore);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly descriptionInput =
    viewChild<ElementRef<HTMLInputElement>>('descriptionInput');
  protected readonly placeSearchInput =
    viewChild<ElementRef<HTMLInputElement>>('placeSearchInput');
  private exchangeRateRequestToken = 0;

  readonly mode = input<'create' | 'edit'>('create');
  readonly transaction = input<TransactionViewModel | null>(null);
  readonly prefill = input<TransactionViewModel | null | undefined>(undefined);
  protected readonly showAdvanced = signal(false);
  protected readonly exchangeRateRefreshPending = signal(false);
  protected readonly isEditMode = computed(() => this.mode() === 'edit');
  protected readonly tags = computed<readonly TagEntity[]>(() =>
    this.store.tags()
  );
  protected readonly wallets = computed<readonly WalletEntity[]>(() =>
    this.store.wallets()
  );
  protected readonly places = computed<readonly PlaceEntity[]>(() =>
    this.store.places()
  );
  private readonly selectedWalletCurrency = signal(
    this.store.defaultCurrency()
  );
  private readonly currencyFollowsWallet = signal(true);
  protected readonly walletCurrency = computed(() =>
    this.selectedWalletCurrency()
  );
  protected readonly categoryView = computed(() => this.buildCategoryView());
  protected readonly currencyOptions = computed<readonly CurrencyOptionView[]>(
    () => {
      const currencies = this.store.currencies();
      if (currencies.length === 0) {
        return [{ id: -1, symbol: this.walletCurrency() }];
      }

      const selectedCurrency = this.form.controls.currency.value?.toUpperCase();
      const hasSelectedCurrency = selectedCurrency
        ? currencies.some(
            (currency) => currency.symbol.toUpperCase() === selectedCurrency
          )
        : true;

      return hasSelectedCurrency || !selectedCurrency
        ? currencies
        : [...currencies, { id: -1, symbol: selectedCurrency }];
    }
  );

  protected readonly form = this.formBuilder.group({
    description: this.formBuilder.control<string>('', {
      validators: [Validators.maxLength(120)],
      nonNullable: true,
    }),
    categoryId: this.formBuilder.control<string>('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
    placeId: this.formBuilder.control<string>('', {
      nonNullable: true,
    }),
    occurredOn: this.formBuilder.control<string>(this.todayIsoString(), {
      validators: [Validators.required],
      nonNullable: true,
    }),
    amount: this.formBuilder.control<string>('', {
      validators: [Validators.required, Validators.pattern(/[0-9]/)],
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
      validators: [
        Validators.required,
        Validators.min(1),
        Validators.max(TransactionCreateFormComponent.MAX_QUANTITY),
      ],
      nonNullable: true,
    }),
    tags: this.formBuilder.control<TagPickerSelection[]>([], {
      nonNullable: true,
    }),
    foreignAmount: this.formBuilder.control<string>(''),
    walletId: this.formBuilder.control<string>('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  protected readonly controls = this.form.controls;
  private readonly selectedTagSelections = toSignal(
    this.form.controls.tags.valueChanges,
    { initialValue: this.form.controls.tags.value }
  );
  protected readonly recentTags = computed<readonly TagEntity[]>(() => {
    const selected = this.selectedTagSelections();
    const selectedIds = new Set(
      selected
        .map((selection) => selection.id)
        .filter((id): id is string => Boolean(id))
    );
    const selectedNames = new Set(
      selected.map((selection) => selection.name.toLowerCase())
    );
    const tagsById = new Map(this.tags().map((tag) => [tag.id, tag]));
    const seen = new Set<string>();
    const recent: TagEntity[] = [];
    const transactions = [...this.store.transactionsView()].sort(
      (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()
    );

    for (const transaction of transactions) {
      for (const tagId of transaction.tagIds) {
        if (seen.has(tagId)) {
          continue;
        }
        seen.add(tagId);

        const tag = tagsById.get(tagId);
        if (
          !tag ||
          selectedIds.has(tag.id) ||
          selectedNames.has(tag.name.toLowerCase())
        ) {
          continue;
        }

        recent.push(tag);
        if (recent.length === TransactionCreateFormComponent.RECENT_TAG_LIMIT) {
          return recent;
        }
      }
    }

    return recent;
  });
  protected readonly selectedPlaceId = toSignal(
    this.form.controls.placeId.valueChanges,
    { initialValue: this.form.controls.placeId.value }
  );
  protected readonly placeDropdownOpen = signal(false);
  protected readonly placeSearch = signal('');
  protected readonly selectedPlaceLabel = computed(() => {
    const placeId = this.selectedPlaceId();
    if (!placeId) {
      return '';
    }

    const place = this.places().find((item) => item.id === placeId);
    return place ? this.formatPlaceLabel(place) : '';
  });
  protected readonly filteredPlaces = computed(() => {
    const query = this.placeSearch().trim().toLowerCase();
    if (!query) {
      return this.places();
    }

    return this.places().filter((place) =>
      [
        place.name,
        place.street ?? '',
        place.city ?? '',
        place.postalCode ?? '',
        place.country ?? '',
      ].some((value) => value.toLowerCase().includes(query))
    );
  });
  readonly closed: OutputEmitterRef<void> = output();
  readonly saved: OutputEmitterRef<TransactionFormSaveResult> = output();

  constructor() {
    afterNextRender(() => {
      if (this.mode() === 'create') {
        this.descriptionInput()?.nativeElement.focus();
      }
    });

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
        this.form.controls.categoryId.setValue(
          this.resolveCategoryId(this.recentDefaults()?.categoryId) ??
            categories[0].id
        );
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
        desiredWallet = wallets.find(
          (wallet) => wallet.id === transaction.walletId
        );
      } else if (prefill) {
        desiredWallet = wallets.find(
          (wallet) => wallet.id === prefill.walletId
        );
      } else if (walletControl.value) {
        desiredWallet = wallets.find(
          (wallet) => wallet.id === walletControl.value
        );
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
      if (!this.currencyFollowsWallet()) {
        return;
      }

      if (control.value !== desiredCurrency) {
        control.setValue(desiredCurrency, { emitEvent: false });
        control.markAsPristine();
        this.syncAmountInDefault();
      }
    });

    effect(() => {
      if (this.showAdvanced()) {
        const input = this.host.nativeElement.querySelector(
          '[formControlName="foreignAmount"]'
        ) as HTMLInputElement | null;
        input?.focus();
      }
    });

    this.form.controls.amount.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.syncAmountInDefault();
      });

    this.form.controls.currency.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.currencyFollowsWallet.set(false);
        this.syncAmountInDefault();
      });

    this.form.controls.occurredOn.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((occurredOn) => {
        this.persistRecentDefaults({ occurredOn });
        this.syncAmountInDefault();
      });

    this.form.controls.categoryId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((categoryId) => {
        this.persistRecentDefaults({ categoryId });
      });

    this.form.controls.walletId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((walletId) => {
        this.syncWalletCurrency(typeof walletId === 'string' ? walletId : null);
      });

    this.syncWalletCurrency(
      typeof this.form.controls.walletId.value === 'string'
        ? this.form.controls.walletId.value
        : null
    );
  }

  protected togglePlaceDropdown(): void {
    if (this.placeDropdownOpen()) {
      this.closePlaceDropdown();
      return;
    }

    this.placeSearch.set('');
    this.placeDropdownOpen.set(true);
    this.focusPlaceSearch();
  }

  protected closePlaceDropdown(): void {
    this.placeDropdownOpen.set(false);
    this.placeSearch.set('');
  }

  protected onPlaceSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.placeSearch.set(input?.value ?? '');
  }

  protected selectPlace(placeId: string): void {
    const control = this.form.controls.placeId;
    control.setValue(placeId);
    control.markAsDirty();
    control.markAsTouched();
    this.closePlaceDropdown();
  }

  protected onPlaceDropdownFocusOut(event: FocusEvent): void {
    this.closeDropdownWhenFocusLeaves(event, () => this.closePlaceDropdown());
  }

  protected formatPlaceLabel(place: PlaceEntity): string {
    return place.city ? `${place.name} · ${place.city}` : place.name;
  }

  protected updateTagSelections(
    selections: readonly TagPickerSelection[]
  ): void {
    this.form.controls.tags.setValue([...selections]);
  }

  protected toggleAdvanced(): void {
    this.showAdvanced.update((value) => !value);
  }

  protected async updateExchangeRateFromTable(): Promise<void> {
    if (this.exchangeRateRefreshPending()) {
      return;
    }

    const amount = parseAmountInput(this.form.controls.amount.value);
    if (amount === null) {
      this.form.controls.amount.setErrors({ invalid: true });
      return;
    }

    const occurredAt = this.parseDate(this.form.controls.occurredOn.value);
    if (!occurredAt) {
      this.form.controls.occurredOn.setErrors({ invalid: true });
      return;
    }

    const currency = (this.form.controls.currency.value ?? '').toUpperCase();
    const defaultCurrency = this.walletCurrency().toUpperCase();

    this.exchangeRateRefreshPending.set(true);
    try {
      const amountInDefault = await this.calculateAmountInDefault(
        amount,
        currency || defaultCurrency,
        defaultCurrency,
        occurredAt
      );

      if (amountInDefault === null) {
        this.form.controls.foreignAmount.setValue('', { emitEvent: false });
        this.setExchangeRateUnavailableError();
        return;
      }

      this.form.controls.foreignAmount.setValue(amountInDefault.toFixed(2), {
        emitEvent: false,
      });
      this.form.controls.foreignAmount.markAsDirty();
      this.clearExchangeRateUnavailableError();
    } finally {
      this.exchangeRateRefreshPending.set(false);
    }
  }

  protected selectDirection(direction: TransactionDirection): void {
    this.form.controls.direction.setValue(direction);
  }

  protected async submitAndAddAnother(): Promise<void> {
    if (this.isEditMode()) {
      return;
    }

    await this.submit('continue');
  }

  protected setDateToToday(): void {
    const control = this.form.controls.occurredOn;
    control.setValue(this.todayIsoString());
    control.markAsDirty();
    control.markAsTouched();
  }

  protected onClose(): void {
    this.resetForm();
    this.closed.emit();
  }

  protected async submit(
    afterCreate: 'close' | 'continue' = 'close'
  ): Promise<void> {
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

    const quantity =
      mode === 'create' ? this.clampQuantity(raw.quantity ?? 1) : 1;
    if (mode === 'create') {
      this.form.controls.quantity.setValue(quantity);
    }

    const tagSelections = this.form.controls.tags.value;
    const newTagNames = Array.from(
      new Set(
        tagSelections
          .filter((selection) => !selection.id)
          .map((selection) => this.sanitizeTagName(selection.name))
          .filter((name): name is string => !!name)
      )
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
    const currency = /^[A-Z]{3}$/.test(currencyInput)
      ? currencyInput
      : defaultCurrency;
    const amountInDefault = raw.foreignAmount
      ? parseAmountInput(raw.foreignAmount)
      : null;
    if (raw.foreignAmount && amountInDefault === null) {
      this.form.controls.foreignAmount.setErrors({ invalid: true });
      return;
    }

    const resolvedAmountInDefault =
      amountInDefault ??
      (currency === defaultCurrency
        ? null
        : await this.calculateAmountInDefault(
            amount,
            currency,
            defaultCurrency,
            occurredAt
          ));

    if (currency !== defaultCurrency && resolvedAmountInDefault === null) {
      this.setExchangeRateUnavailableError();
      return;
    }

    const basePayload: UpdateTransactionPayload = {
      description: raw.description?.trim() ? raw.description.trim() : null,
      categoryId: raw.categoryId,
      occurredAt,
      amount,
      currency,
      direction: raw.direction,
      tagIds: Array.from(new Set(finalTagIds)),
      foreignAmount: resolvedAmountInDefault,
      foreignCurrency: resolvedAmountInDefault ? defaultCurrency : null,
      walletId,
      placeId: raw.placeId || null,
    };

    if (mode === 'create') {
      const result = await this.store.createTransactions({
        ...basePayload,
        quantity,
      });

      if (result.success) {
        this.persistRecentDefaults({
          occurredOn: raw.occurredOn,
          categoryId: raw.categoryId,
        });
        this.saved.emit('created');
        if (afterCreate === 'continue') {
          this.resetForm();
          this.focusDescriptionInput();
          return;
        }

        this.onClose();
      }
      return;
    }

    const transaction = this.transaction();
    if (!transaction) {
      return;
    }

    const updateResult = await this.store.updateTransaction(
      transaction.id,
      basePayload
    );
    if (updateResult.success) {
      this.saved.emit('updated');
      this.onClose();
    }
  }

  private resetForm(): void {
    const defaults = this.recentDefaults();
    const defaultCategory =
      this.resolveCategoryId(defaults?.categoryId) ??
      this.store.categories()[0]?.id ??
      '';
    this.form.reset({
      description: '',
      categoryId: defaultCategory,
      placeId: '',
      occurredOn: defaults?.occurredOn ?? this.todayIsoString(),
      amount: '',
      currency: this.store.defaultCurrency(),
      direction: 'expense',
      quantity: 1,
      tags: [] as TagPickerSelection[],
      foreignAmount: '',
      walletId: this.store.defaultWalletId() ?? '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.showAdvanced.set(false);
    this.closeFormDropdowns();
    this.currencyFollowsWallet.set(true);
    this.store.dismissMutationError();
    this.syncWalletCurrency(this.form.controls.walletId.value, true);
    this.syncAmountInDefault();
  }

  private persistRecentDefaults(
    patch: Partial<{ occurredOn: string; categoryId: string }>
  ): void {
    if (this.mode() !== 'create' || this.prefill()) {
      return;
    }

    const current = this.recentDefaults();
    const next = {
      occurredOn: this.isDateInputValue(patch.occurredOn ?? current?.occurredOn)
        ? patch.occurredOn ?? current?.occurredOn
        : undefined,
      categoryId:
        this.resolveCategoryId(patch.categoryId ?? current?.categoryId) ??
        undefined,
    };

    if (!next.occurredOn && !next.categoryId) {
      return;
    }

    try {
      sessionStorage.setItem(
        TransactionCreateFormComponent.RECENT_DEFAULTS_STORAGE_KEY,
        JSON.stringify(next)
      );
    } catch {
      return;
    }
  }

  private recentDefaults(): {
    occurredOn?: string;
    categoryId?: string;
  } | null {
    try {
      const raw = sessionStorage.getItem(
        TransactionCreateFormComponent.RECENT_DEFAULTS_STORAGE_KEY
      );
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as {
        occurredOn?: unknown;
        categoryId?: unknown;
      };
      const occurredOn =
        typeof parsed.occurredOn === 'string' &&
        this.isDateInputValue(parsed.occurredOn)
          ? parsed.occurredOn
          : undefined;
      const categoryId =
        typeof parsed.categoryId === 'string'
          ? this.resolveCategoryId(parsed.categoryId) ?? undefined
          : undefined;

      return occurredOn || categoryId ? { occurredOn, categoryId } : null;
    } catch {
      return null;
    }
  }

  private resolveCategoryId(
    categoryId: string | null | undefined
  ): string | null {
    if (!categoryId) {
      return null;
    }

    return this.store
      .categories()
      .some((category) => category.id === categoryId)
      ? categoryId
      : null;
  }

  private isDateInputValue(value: string | null | undefined): value is string {
    return !!value && this.parseDate(value) !== null;
  }

  private populateFormForEdit(transaction: TransactionViewModel): void {
    const walletCurrency =
      this.wallets().find((wallet) => wallet.id === transaction.walletId)
        ?.currency ?? this.store.defaultCurrency();
    this.currencyFollowsWallet.set(
      transaction.currency.toUpperCase() === walletCurrency.toUpperCase()
    );
    this.form.reset({
      description: transaction.description ?? '',
      categoryId: transaction.categoryId,
      placeId: transaction.placeId ?? '',
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
    this.closeFormDropdowns();
    this.store.dismissMutationError();
    this.syncWalletCurrency(transaction.walletId);
    this.syncAmountInDefault();
  }

  private populateFormForCreatePrefill(
    transaction: TransactionViewModel
  ): void {
    const walletCurrency =
      this.wallets().find((wallet) => wallet.id === transaction.walletId)
        ?.currency ?? this.store.defaultCurrency();
    this.currencyFollowsWallet.set(
      transaction.currency.toUpperCase() === walletCurrency.toUpperCase()
    );
    this.form.reset({
      description: transaction.description ?? '',
      categoryId: transaction.categoryId,
      placeId: transaction.placeId ?? '',
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
    this.closeFormDropdowns();
    this.store.dismissMutationError();
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
      return;
    }

    const lookup = new Map(
      this.store.tags().map((tag) => [tag.name.toLowerCase(), tag])
    );
    const updated = this.form.controls.tags.value.map((selection) => {
      if (selection.id) {
        return selection;
      }

      const match = lookup.get(selection.name.toLowerCase());
      return match ? { id: match.id, name: match.name } : selection;
    });

    this.form.controls.tags.setValue(updated as TagPickerSelection[]);
  }

  private mapTagIdsToSelections(ids: readonly string[]): TagPickerSelection[] {
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

  private syncWalletCurrency(
    walletId: string | null | undefined,
    updateCurrencyControl = false
  ): void {
    const wallets = this.wallets();
    const wallet = walletId
      ? wallets.find((item) => item.id === walletId) ?? null
      : null;
    const currency = wallet?.currency ?? this.store.defaultCurrency();
    this.selectedWalletCurrency.set(currency);

    const currencyControl = this.form.controls.currency;
    if (
      updateCurrencyControl ||
      !currencyControl.value ||
      this.currencyFollowsWallet()
    ) {
      currencyControl.setValue(currency, { emitEvent: false });
      currencyControl.markAsPristine();
      this.currencyFollowsWallet.set(true);
    }
  }

  private syncAmountInDefault(): void {
    const requestToken = ++this.exchangeRateRequestToken;
    void this.syncAmountInDefaultFromExchangeRate(requestToken);
  }

  private async syncAmountInDefaultFromExchangeRate(
    requestToken: number
  ): Promise<void> {
    const amountControl = this.form.controls.amount;
    const currencyControl = this.form.controls.currency;
    const defaultAmountControl = this.form.controls.foreignAmount;

    const amount = parseAmountInput(amountControl.value);
    if (amount === null) {
      defaultAmountControl.setValue('', { emitEvent: false });
      this.clearExchangeRateUnavailableError();
      return;
    }

    const currency = (currencyControl.value ?? '').toUpperCase();
    const defaultCurrency = this.walletCurrency().toUpperCase();
    const occurredAt = this.parseDate(this.form.controls.occurredOn.value);
    if (!occurredAt) {
      return;
    }

    const amountInDefault = await this.calculateAmountInDefault(
      amount,
      currency || defaultCurrency,
      defaultCurrency,
      occurredAt
    );

    if (requestToken !== this.exchangeRateRequestToken) {
      return;
    }

    if (amountInDefault === null) {
      defaultAmountControl.setValue('', { emitEvent: false });
      if ((currency || defaultCurrency) !== defaultCurrency) {
        this.setExchangeRateUnavailableError();
      }
      return;
    }

    defaultAmountControl.setValue(amountInDefault.toFixed(2), {
      emitEvent: false,
    });
    this.clearExchangeRateUnavailableError();
  }

  private async calculateAmountInDefault(
    amount: number,
    sourceCurrency: string,
    targetCurrency: string,
    occurredAt: Date
  ): Promise<number | null> {
    if (!sourceCurrency || !targetCurrency) {
      return null;
    }

    if (sourceCurrency === targetCurrency) {
      return amount;
    }

    try {
      const rate = await this.store.getExchangeRate(
        sourceCurrency,
        targetCurrency,
        occurredAt
      );
      return rate === null ? null : amount * rate;
    } catch (error) {
      logError('TransactionCreateForm', 'Failed to load exchange rate', error);
      return null;
    }
  }

  private setExchangeRateUnavailableError(): void {
    const control = this.form.controls.foreignAmount;
    control.setErrors({
      ...(control.errors ?? {}),
      exchangeRateUnavailable: true,
    });
    control.markAsTouched();
  }

  private clearExchangeRateUnavailableError(): void {
    const control = this.form.controls.foreignAmount;
    const errors = control.errors;
    if (!errors?.['exchangeRateUnavailable']) {
      return;
    }

    const remaining = { ...errors };
    delete remaining['exchangeRateUnavailable'];
    control.setErrors(Object.keys(remaining).length > 0 ? remaining : null);
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const [year, month, day] = value
      .split('-')
      .map((segment) => Number(segment));
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

    return Math.min(
      Math.floor(value),
      TransactionCreateFormComponent.MAX_QUANTITY
    );
  }

  private buildCategoryView(): readonly {
    groupName: string | null;
    options: readonly CategorySelectOption[];
  }[] {
    const grouped = this.store.groupedCategories();
    const ungrouped = this.store.ungroupedCategories();
    const categoryNames = new Map(
      this.store.categories().map((category) => [category.id, category.name])
    );

    const groupedView = grouped.map((group) => ({
      groupName: group.name,
      options: group.categories.map((category) => ({
        id: category.id,
        label: this.buildCategoryLabel(
          category.id,
          category.name,
          category.parentId,
          categoryNames
        ),
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
                label: this.buildCategoryLabel(
                  category.id,
                  category.name,
                  category.parentId,
                  categoryNames
                ),
                groupName: null,
              })),
            },
          ]
        : [];

    return [...groupedView, ...ungroupedView];
  }

  private buildCategoryLabel(
    categoryId: string,
    categoryName: string,
    parentId: string | null,
    categoryNames: ReadonlyMap<string, string>
  ): string {
    const names = [categoryName];
    let currentParentId = parentId;
    const visited = new Set<string>([categoryId]);

    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      const parentName = categoryNames.get(currentParentId);
      if (!parentName) {
        break;
      }
      names.unshift(parentName);
      const parent = this.store
        .categories()
        .find((category) => category.id === currentParentId);
      currentParentId = parent?.parentId ?? null;
    }

    return names.join(' / ');
  }

  private focusPlaceSearch(): void {
    setTimeout(() => {
      this.placeSearchInput()?.nativeElement.focus();
    }, 0);
  }

  private focusDescriptionInput(): void {
    setTimeout(() => {
      this.descriptionInput()?.nativeElement.focus();
    }, 0);
  }

  private closeDropdownWhenFocusLeaves(
    event: FocusEvent,
    close: () => void
  ): void {
    const container = event.currentTarget as HTMLElement | null;
    const nextTarget = event.relatedTarget as Node | null;
    if (!container || !nextTarget || !container.contains(nextTarget)) {
      close();
    }
  }

  private closeFormDropdowns(): void {
    this.closePlaceDropdown();
  }
}

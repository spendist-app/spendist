import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  WritableSignal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { logError } from '../../../core/logger';
import {
  CategorySelectComponent,
  CategorySelectOption,
} from '../../../shared/category-select/category-select.component';
import {
  TagPickerComponent,
  TagPickerSelection,
} from '../../../shared/tag-picker/tag-picker.component';
import {
  RecurringPaymentsStore,
  RecurringAmountMode,
  RecurringCategorySummary,
  RecurringTagSummary,
  RecurringTransactionDirection,
  CurrencyOption,
  WalletEntity,
} from './recurring-payments.store';

type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

type RecurringFormGroup = FormGroup<{
  readonly name: FormControl<string>;
  readonly categoryId: FormControl<string>;
  readonly amount: FormControl<number | null>;
  readonly currency: FormControl<string>;
  readonly amountMode: FormControl<RecurringAmountMode>;
  readonly direction: FormControl<RecurringTransactionDirection>;
  readonly startDate: FormControl<string>;
  readonly endDate: FormControl<string | null>;
  readonly schedule: FormControl<string>;
  readonly scheduleFrequency: FormControl<ScheduleFrequency>;
  readonly scheduleTime: FormControl<string>;
  readonly scheduleDayOfWeek: FormControl<string>;
  readonly scheduleDayOfMonth: FormControl<number>;
  readonly walletId: FormControl<string>;
  readonly tagIds: FormControl<string[]>;
}>;

@Component({
  standalone: true,
  selector: 'app-recurring-payment-form',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    CategorySelectComponent,
    TagPickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recurring-payment-form.component.html',
})
export class RecurringPaymentFormComponent {
  readonly store = inject(RecurringPaymentsStore);
  private readonly transloco = inject(TranslocoService);
  private readonly today = new Date();

  readonly submissionError: WritableSignal<string | null> = signal(null);
  readonly open = input(false);
  readonly dismiss = output<void>();

  readonly form: RecurringFormGroup = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    categoryId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    amount: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    currency: new FormControl(this.store.defaultCurrency(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    amountMode: new FormControl<RecurringAmountMode>('fixed', {
      nonNullable: true,
    }),
    walletId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    direction: new FormControl<RecurringTransactionDirection>('expense', {
      nonNullable: true,
    }),
    startDate: new FormControl(this.formatDate(this.today), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDate: new FormControl<string | null>(null),
    schedule: new FormControl('0 12 1 * *', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
    scheduleFrequency: new FormControl<ScheduleFrequency>('monthly', {
      nonNullable: true,
    }),
    scheduleTime: new FormControl('12:00', {
      nonNullable: true,
    }),
    scheduleDayOfWeek: new FormControl('1', {
      nonNullable: true,
    }),
    scheduleDayOfMonth: new FormControl(1, {
      nonNullable: true,
    }),
    tagIds: new FormControl<string[]>([], {
      nonNullable: true,
    }),
  });

  readonly nameControl = this.form.controls.name;
  readonly categoryControl = this.form.controls.categoryId;
  readonly amountControl = this.form.controls.amount;
  readonly currencyControl = this.form.controls.currency;
  readonly amountModeControl = this.form.controls.amountMode;
  readonly walletControl = this.form.controls.walletId;
  readonly scheduleControl = this.form.controls.schedule;
  readonly scheduleFrequencyControl = this.form.controls.scheduleFrequency;
  readonly scheduleTimeControl = this.form.controls.scheduleTime;
  readonly scheduleDayOfWeekControl = this.form.controls.scheduleDayOfWeek;
  readonly scheduleDayOfMonthControl = this.form.controls.scheduleDayOfMonth;
  readonly startDateControl = this.form.controls.startDate;
  readonly selectedTagSelections = signal<readonly TagPickerSelection[]>([]);
  readonly selectedTags = computed(() =>
    this.selectedTagSelections()
      .map((selection) => selection.id)
      .filter((id): id is string => Boolean(id))
  );
  readonly recentTags = computed(() => {
    const seen = new Set<string>();
    const recent: RecurringTagSummary[] = [];
    const recurring = [...this.store.recurringTransactions()].sort(
      (left, right) => right.startDate.getTime() - left.startDate.getTime()
    );
    for (const transaction of recurring) {
      for (const tag of transaction.tags) {
        if (!seen.has(tag.id)) {
          seen.add(tag.id);
          recent.push(tag);
        }
      }
    }
    return recent;
  });
  readonly scheduleFrequencyView = signal<ScheduleFrequency>('monthly');
  readonly selectedCurrencyView = signal(this.store.defaultCurrency());
  private readonly currencyFollowsWallet = signal(true);
  private readonly selectedWalletCurrency = signal(
    this.store.defaultCurrency()
  );
  readonly walletCurrency = computed(() => this.selectedWalletCurrency());
  readonly isEditingAllowance = computed(
    () => this.store.editingRecurring()?.sourceModule === 'allowance'
  );
  readonly currencyOptions = computed<readonly CurrencyOption[]>(() => {
    const currencies = this.store.currencies();
    if (currencies.length === 0) {
      return [{ id: -1, symbol: this.walletCurrency() }];
    }

    const selectedCurrency = this.selectedCurrencyView().toUpperCase();
    const hasSelectedCurrency = selectedCurrency
      ? currencies.some(
          (currency) => currency.symbol.toUpperCase() === selectedCurrency
        )
      : true;

    return hasSelectedCurrency || !selectedCurrency
      ? currencies
      : [...currencies, { id: -1, symbol: selectedCurrency }];
  });
  readonly wallets = computed<readonly WalletEntity[]>(() =>
    this.store.wallets()
  );
  readonly categoryView = computed(() => this.buildCategoryView());
  readonly schedulePreview = signal('');

  constructor() {
    this.amountModeControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((mode) => {
        this.syncAmountValidators(mode);
        this.submissionError.set(null);
      });

    this.currencyControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((currency) => {
        this.currencyFollowsWallet.set(false);
        this.selectedCurrencyView.set(currency);
      });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (
        this.submissionError() ===
        this.transloco.translate(
          'modules.recurringPayments.form.notifications.invalid'
        )
      ) {
        this.submissionError.set(null);
      }
    });

    this.scheduleFrequencyControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((frequency) => {
        this.scheduleFrequencyView.set(frequency);
        this.syncScheduleControl();
      });

    this.scheduleTimeControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        const normalized = this.normalizeTime(value);
        if (normalized !== value) {
          this.scheduleTimeControl.setValue(normalized, { emitEvent: false });
        }
        this.syncScheduleControl();
      });

    this.scheduleDayOfWeekControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.syncScheduleControl();
      });

    this.scheduleDayOfMonthControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        const day = this.normalizeDayOfMonth(value);
        if (day !== value) {
          this.scheduleDayOfMonthControl.setValue(day, { emitEvent: false });
        }
        this.syncScheduleControl();
      });

    effect(() => {
      if (!this.open()) {
        this.resetForm();
        this.submissionError.set(null);
      }
    });

    effect(() => {
      const tags = this.selectedTags();
      this.form.controls.tagIds.setValue(tags, { emitEvent: false });
    });

    effect(() => {
      const editing = this.store.editingRecurring();
      if (!editing) {
        return;
      }

      const tagIds = editing.tags.map((tag) => tag.id);

      this.form.patchValue(
        {
          name: editing.name,
          categoryId: editing.categoryId,
          amount: editing.amount,
          currency: editing.currency,
          amountMode: editing.amountMode,
          walletId: editing.walletId,
          direction: editing.direction,
          startDate: this.formatDate(editing.startDate),
          endDate: editing.endDate ? this.formatDate(editing.endDate) : null,
          schedule: editing.schedule,
          tagIds,
        },
        { emitEvent: false }
      );

      this.selectedTagSelections.set(
        editing.tags.map((tag) => ({ id: tag.id, name: tag.name }))
      );
      this.selectedCurrencyView.set(editing.currency);
      this.currencyFollowsWallet.set(false);
      this.form.controls.tagIds.setValue(tagIds, { emitEvent: false });
      this.applyScheduleFromCron(editing.schedule);
      this.syncAmountValidators(editing.amountMode);
      this.syncWalletCurrency(editing.walletId);
      this.submissionError.set(null);
      this.form.markAsPristine();
      this.form.markAsUntouched();
    });

    effect(() => {
      const available = new Set(this.store.tags().map((tag) => tag.id));
      const current = this.selectedTagSelections();
      const filtered = current.filter(
        (selection) => !selection.id || available.has(selection.id)
      );
      if (filtered.length !== current.length) {
        this.selectedTagSelections.set(filtered);
        this.form.controls.tagIds.setValue(
          filtered
            .map((selection) => selection.id)
            .filter((id): id is string => Boolean(id)),
          { emitEvent: false }
        );
        return;
      }
      this.form.controls.tagIds.setValue(this.selectedTags(), {
        emitEvent: false,
      });
    });

    effect(() => {
      if (this.store.isEditing()) {
        return;
      }

      this.resetForm();
    });

    this.walletControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((walletId) => {
        this.syncWalletCurrency(typeof walletId === 'string' ? walletId : null);
        this.submissionError.set(null);
      });

    effect(() => {
      const wallets = this.wallets();
      const currentWalletId = this.walletControl.value;
      if (!wallets.some((wallet) => wallet.id === currentWalletId)) {
        const fallback = this.store.defaultWalletId() ?? wallets[0]?.id ?? '';
        this.walletControl.setValue(fallback, { emitEvent: false });
        this.syncWalletCurrency(fallback, true);
        return;
      }
      this.syncWalletCurrency(
        typeof currentWalletId === 'string' ? currentWalletId : null
      );
    });

    this.syncScheduleControl();
  }

  async onSubmit(): Promise<void> {
    this.syncScheduleControl();

    if (this.form.invalid || this.store.mutationPending()) {
      this.form.markAllAsTouched();
      if (this.form.invalid) {
        this.submissionError.set(
          this.transloco.translate(
            'modules.recurringPayments.form.notifications.invalid'
          )
        );
      }
      return;
    }

    this.submissionError.set(null);

    const {
      name,
      categoryId,
      amount,
      currency,
      amountMode,
      direction,
      startDate,
      endDate,
      schedule,
      walletId,
    } = this.form.value;
    const resolvedAmountMode = amountMode ?? 'fixed';

    if (resolvedAmountMode === 'fixed' && amount == null) {
      this.submissionError.set(
        this.transloco.translate(
          'modules.recurringPayments.form.fields.amount.error'
        )
      );
      return;
    }

    const resolvedWalletId = (walletId ?? '').trim();
    if (!resolvedWalletId) {
      this.walletControl.setErrors({ required: true });
      this.walletControl.markAsTouched();
      return;
    }

    const editing = this.store.editingRecurring();
    try {
      const tagIds = await this.resolveSelectedTagIds();
      const payload = {
        name: name?.trim() ?? '',
        categoryId: categoryId ?? '',
        amount: resolvedAmountMode === 'variable' ? 0 : Number(amount),
        currency: (currency ?? this.walletCurrency()).toUpperCase(),
        amountMode: resolvedAmountMode,
        direction: (direction ?? 'expense') as RecurringTransactionDirection,
        startDate: startDate ?? this.formatDate(this.today),
        endDate: endDate && endDate.length > 0 ? endDate : null,
        schedule: this.buildCronSchedule() || schedule || '',
        tagIds,
        walletId: resolvedWalletId,
      };

      if (editing) {
        await this.store.updateRecurringTransaction(editing.id, payload);
      } else {
        await this.store.createRecurringTransaction(payload);
      }

      this.resetForm();
      this.dismiss.emit();
    } catch (error) {
      logError('RecurringPaymentForm', 'submission failed', error);
      const storeError = this.store.mutationError();
      const shouldTranslate =
        !!storeError &&
        (storeError.startsWith('modules.') || storeError.startsWith('common.'));
      const message = shouldTranslate
        ? this.transloco.translate(storeError)
        : storeError;

      this.submissionError.set(
        message ??
          this.transloco.translate(
            'modules.recurringPayments.form.notifications.error'
          )
      );
    }
  }

  dismissError(): void {
    this.submissionError.set(null);
  }

  updateTagSelections(selections: readonly TagPickerSelection[]): void {
    this.selectedTagSelections.set([...selections]);
    this.form.controls.tagIds.setValue(
      selections
        .map((selection) => selection.id)
        .filter((id): id is string => Boolean(id)),
      { emitEvent: false }
    );
  }

  onDismiss(): void {
    this.dismiss.emit();
  }

  readonly isWeeklySchedule = computed(
    () => this.scheduleFrequencyView() === 'weekly'
  );
  readonly isMonthlySchedule = computed(
    () => this.scheduleFrequencyView() === 'monthly'
  );

  updateScheduleFrequency(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const value = target?.value;
    if (value === 'daily' || value === 'weekly' || value === 'monthly') {
      this.setScheduleFrequency(value);
    }
  }

  updateScheduleTime(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.setScheduleTime(this.normalizeTime(target?.value ?? '12:00'));
  }

  updateScheduleDayOfWeek(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    this.setScheduleDayOfWeek(target?.value ?? '1');
  }

  updateScheduleDayOfMonth(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.setScheduleDayOfMonth(this.normalizeDayOfMonth(target?.value ?? 1));
  }

  private resetForm(): void {
    const defaultWalletId = this.store.defaultWalletId();
    this.currencyFollowsWallet.set(true);
    this.form.reset(
      {
        name: '',
        categoryId: '',
        amount: null,
        currency: this.store.defaultCurrency(),
        amountMode: 'fixed',
        walletId: defaultWalletId ?? '',
        direction: 'expense',
        startDate: this.formatDate(this.today),
        endDate: null,
        schedule: '0 12 1 * *',
        scheduleFrequency: 'monthly',
        scheduleTime: '12:00',
        scheduleDayOfWeek: '1',
        scheduleDayOfMonth: 1,
        tagIds: [],
      },
      { emitEvent: false }
    );
    this.selectedTagSelections.set([]);
    this.submissionError.set(null);
    this.form.controls.tagIds.setValue([], { emitEvent: false });
    this.setScheduleFrequency('monthly', false);
    this.setScheduleTime('12:00', false);
    this.setScheduleDayOfWeek('1', false);
    this.setScheduleDayOfMonth(1, false);
    this.syncAmountValidators('fixed');
    this.syncScheduleControl();
    this.syncWalletCurrency(defaultWalletId, true);
  }

  private async resolveSelectedTagIds(): Promise<readonly string[]> {
    const selections = this.selectedTagSelections();
    const newNames = selections
      .filter((selection) => !selection.id)
      .map((selection) => selection.name);
    if (newNames.length > 0) {
      await this.store.ensureTags(newNames);
    }

    const tagsByName = new Map(
      this.store.tags().map((tag) => [tag.name.toLowerCase(), tag.id])
    );
    const resolved = selections
      .map(
        (selection) =>
          selection.id ?? tagsByName.get(selection.name.toLowerCase()) ?? null
      )
      .filter((id): id is string => Boolean(id));

    this.selectedTagSelections.set(
      selections.map((selection) => ({
        ...selection,
        id:
          selection.id ?? tagsByName.get(selection.name.toLowerCase()) ?? null,
      }))
    );
    return Array.from(new Set(resolved));
  }

  private syncWalletCurrency(
    walletId: string | null | undefined,
    updateCurrencyControl = false
  ): void {
    const wallets = this.store.wallets();
    const wallet = walletId
      ? wallets.find((item) => item.id === walletId) ?? null
      : null;
    const currency = wallet?.currency ?? this.store.defaultCurrency();
    this.selectedWalletCurrency.set(currency);
    if (
      updateCurrencyControl ||
      !this.currencyControl.value ||
      this.currencyFollowsWallet()
    ) {
      this.currencyControl.setValue(currency, { emitEvent: false });
      this.selectedCurrencyView.set(currency);
      this.currencyControl.markAsPristine();
      this.currencyFollowsWallet.set(true);
    }
  }

  private buildCategoryView(): readonly {
    groupName: string | null;
    options: readonly CategorySelectOption[];
  }[] {
    const categories = this.store.categories();
    const categoryNames = new Map(
      categories.map((category) => [category.id, category.name])
    );

    const groupedView = this.store.groupedCategories().map((group) => ({
      groupName: group.name,
      options: group.categories.map((category) => ({
        id: category.id,
        label: this.buildCategoryLabel(category, categories, categoryNames),
      })),
    }));

    const ungrouped = this.store.ungroupedCategories();
    const ungroupedView =
      ungrouped.length > 0
        ? [
            {
              groupName: null,
              options: ungrouped.map((category) => ({
                id: category.id,
                label: this.buildCategoryLabel(
                  category,
                  categories,
                  categoryNames
                ),
              })),
            },
          ]
        : [];

    return [...groupedView, ...ungroupedView];
  }

  private buildCategoryLabel(
    category: RecurringCategorySummary,
    categories: readonly RecurringCategorySummary[],
    categoryNames: ReadonlyMap<string, string>
  ): string {
    const names = [category.name];
    let currentParentId = category.parentId;
    const visited = new Set<string>([category.id]);

    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      const parentName = categoryNames.get(currentParentId);
      if (!parentName) {
        break;
      }

      names.unshift(parentName);
      const parent = categories.find((item) => item.id === currentParentId);
      currentParentId = parent?.parentId ?? null;
    }

    return names.join(' / ');
  }

  private buildCronSchedule(): string {
    const [hourPart, minutePart] = this.scheduleTimeControl.value.split(':');
    const hour = this.clampCronNumber(hourPart, 0, 23, 12);
    const minute = this.clampCronNumber(minutePart, 0, 59, 0);
    const utc = this.localScheduleToUtc(hour, minute);

    if (this.scheduleFrequencyControl.value === 'daily') {
      return `${utc.minute} ${utc.hour} * * *`;
    }

    if (this.scheduleFrequencyControl.value === 'weekly') {
      return `${utc.minute} ${utc.hour} * * ${utc.dayOfWeek}`;
    }

    return `${utc.minute} ${utc.hour} ${utc.dayOfMonth} * *`;
  }

  private applyScheduleFromCron(schedule: string): void {
    const parts = schedule.trim().split(/\s+/);
    if (parts.length !== 5) {
      this.syncScheduleControl();
      return;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    if (month !== '*') {
      this.syncScheduleControl();
      return;
    }

    const hourNumber = this.clampCronNumber(hour, 0, 23, 12);
    const minuteNumber = this.clampCronNumber(minute, 0, 59, 0);

    if (dayOfMonth === '*' && dayOfWeek === '*') {
      const local = this.utcDailyScheduleToLocal(hourNumber, minuteNumber);
      this.setScheduleFrequency('daily', false);
      this.setScheduleTime(local.time, false);
    } else if (dayOfMonth === '*' && dayOfWeek !== '*') {
      const local = this.utcWeeklyScheduleToLocal(
        hourNumber,
        minuteNumber,
        dayOfWeek
      );
      this.setScheduleFrequency('weekly', false);
      this.setScheduleDayOfWeek(local.dayOfWeek, false);
      this.setScheduleTime(local.time, false);
    } else {
      const local = this.utcMonthlyScheduleToLocal(
        hourNumber,
        minuteNumber,
        dayOfMonth
      );
      this.setScheduleFrequency('monthly', false);
      this.setScheduleDayOfMonth(local.dayOfMonth, false);
      this.setScheduleTime(local.time, false);
    }

    this.syncScheduleControl();
  }

  private syncScheduleControl(): void {
    const schedule = this.buildCronSchedule();
    this.scheduleControl.setValue(schedule, { emitEvent: false });
    this.schedulePreview.set(schedule);
  }

  private syncAmountValidators(mode: RecurringAmountMode): void {
    if (mode === 'variable') {
      this.amountControl.clearValidators();
      this.amountControl.setValue(null, { emitEvent: false });
      this.amountControl.disable({ emitEvent: false });
    } else {
      this.amountControl.enable({ emitEvent: false });
      this.amountControl.setValidators([
        Validators.required,
        Validators.min(0.01),
      ]);
    }

    this.amountControl.updateValueAndValidity({ emitEvent: false });
  }

  private normalizeTime(value: string): string {
    const [hourPart, minutePart] = value.split(':');
    const hour = `${this.clampCronNumber(hourPart, 0, 23, 12)}`.padStart(
      2,
      '0'
    );
    const minute = `${this.clampCronNumber(minutePart, 0, 59, 0)}`.padStart(
      2,
      '0'
    );
    return `${hour}:${minute}`;
  }

  private normalizeDayOfMonth(value: string | number): number {
    return this.clampCronNumber(value, 1, 31, 1);
  }

  private setScheduleFrequency(
    value: ScheduleFrequency,
    emitEvent = true
  ): void {
    this.scheduleFrequencyView.set(value);
    if (this.scheduleFrequencyControl.value !== value) {
      this.scheduleFrequencyControl.setValue(value, { emitEvent });
    }
    this.syncScheduleControl();
  }

  private setScheduleTime(value: string, emitEvent = true): void {
    const normalized = this.normalizeTime(value);
    if (this.scheduleTimeControl.value !== normalized) {
      this.scheduleTimeControl.setValue(normalized, { emitEvent });
    }
    this.syncScheduleControl();
  }

  private setScheduleDayOfWeek(value: string, emitEvent = true): void {
    if (this.scheduleDayOfWeekControl.value !== value) {
      this.scheduleDayOfWeekControl.setValue(value, { emitEvent });
    }
    this.syncScheduleControl();
  }

  private setScheduleDayOfMonth(
    value: string | number,
    emitEvent = true
  ): void {
    const day = this.normalizeDayOfMonth(value);
    if (this.scheduleDayOfMonthControl.value !== day) {
      this.scheduleDayOfMonthControl.setValue(day, { emitEvent });
    }
    this.syncScheduleControl();
  }

  private clampCronNumber(
    value: string | number | undefined,
    min: number,
    max: number,
    fallback: number
  ): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(Math.max(Math.trunc(parsed), min), max);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private localScheduleToUtc(
    hour: number,
    minute: number
  ): {
    readonly hour: number;
    readonly minute: number;
    readonly dayOfWeek: number;
    readonly dayOfMonth: number;
  } {
    const frequency = this.scheduleFrequencyControl.value;
    const now = new Date();
    let localDate: Date;

    if (frequency === 'weekly') {
      const targetDay = this.clampCronNumber(
        this.scheduleDayOfWeekControl.value,
        0,
        6,
        1
      );
      const daysUntilTarget = (targetDay - now.getDay() + 7) % 7;
      localDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + daysUntilTarget,
        hour,
        minute,
        0,
        0
      );
    } else if (frequency === 'monthly') {
      const targetDay = this.normalizeDayOfMonth(
        this.scheduleDayOfMonthControl.value
      );
      localDate = this.localDateForMonthlyDay(targetDay, hour, minute);
    } else {
      localDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute,
        0,
        0
      );
    }

    return {
      hour: localDate.getUTCHours(),
      minute: localDate.getUTCMinutes(),
      dayOfWeek: localDate.getUTCDay(),
      dayOfMonth: localDate.getUTCDate(),
    };
  }

  private utcDailyScheduleToLocal(
    hour: number,
    minute: number
  ): { readonly time: string } {
    const now = new Date();
    const localDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        hour,
        minute,
        0,
        0
      )
    );
    return { time: this.formatTime(localDate) };
  }

  private utcWeeklyScheduleToLocal(
    hour: number,
    minute: number,
    dayOfWeek: string
  ): { readonly time: string; readonly dayOfWeek: string } {
    const now = new Date();
    const targetDay = this.clampCronNumber(dayOfWeek, 0, 7, 1) % 7;
    const daysUntilTarget = (targetDay - now.getUTCDay() + 7) % 7;
    const localDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + daysUntilTarget,
        hour,
        minute,
        0,
        0
      )
    );
    return {
      time: this.formatTime(localDate),
      dayOfWeek: `${localDate.getDay()}`,
    };
  }

  private utcMonthlyScheduleToLocal(
    hour: number,
    minute: number,
    dayOfMonth: string
  ): { readonly time: string; readonly dayOfMonth: number } {
    const targetDay = this.clampCronNumber(dayOfMonth, 1, 31, 1);
    const utcDate = this.utcDateForMonthlyDay(targetDay, hour, minute);
    return {
      time: this.formatTime(utcDate),
      dayOfMonth: utcDate.getDate(),
    };
  }

  private localDateForMonthlyDay(
    day: number,
    hour: number,
    minute: number
  ): Date {
    const now = new Date();
    for (let offset = 0; offset < 12; offset += 1) {
      const candidate = new Date(
        now.getFullYear(),
        now.getMonth() + offset,
        day,
        hour,
        minute,
        0,
        0
      );
      if (candidate.getDate() === day) {
        return candidate;
      }
    }

    return new Date(now.getFullYear(), now.getMonth(), 1, hour, minute, 0, 0);
  }

  private utcDateForMonthlyDay(
    day: number,
    hour: number,
    minute: number
  ): Date {
    const now = new Date();
    for (let offset = 0; offset < 12; offset += 1) {
      const candidate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() + offset,
          day,
          hour,
          minute,
          0,
          0
        )
      );
      if (candidate.getUTCDate() === day) {
        return candidate;
      }
    }

    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, hour, minute, 0, 0)
    );
  }

  private formatTime(value: Date): string {
    const hour = `${value.getHours()}`.padStart(2, '0');
    const minute = `${value.getMinutes()}`.padStart(2, '0');
    return `${hour}:${minute}`;
  }
}

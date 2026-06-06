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
import {
  RecurringPaymentsStore,
  RecurringAmountMode,
  RecurringCategorySummary,
  RecurringTransactionDirection,
  WalletEntity,
} from './recurring-payments.store';

interface CategoryOption {
  readonly id: string;
  readonly label: string;
}

type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

type RecurringFormGroup = FormGroup<{
  readonly name: FormControl<string>;
  readonly categoryId: FormControl<string>;
  readonly amount: FormControl<number | null>;
  readonly amountMode: FormControl<RecurringAmountMode>;
  readonly direction: FormControl<RecurringTransactionDirection>;
  readonly startDate: FormControl<string>;
  readonly endDate: FormControl<string | null>;
  readonly schedule: FormControl<string>;
  readonly walletId: FormControl<string>;
  readonly tagIds: FormControl<string[]>;
}>; 

@Component({
  standalone: true,
  selector: 'app-recurring-payment-form',
  imports: [ReactiveFormsModule, TranslocoPipe],
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
    tagIds: new FormControl<string[]>([], {
      nonNullable: true,
    }),
  });

  readonly nameControl = this.form.controls.name;
  readonly categoryControl = this.form.controls.categoryId;
  readonly amountControl = this.form.controls.amount;
  readonly amountModeControl = this.form.controls.amountMode;
  readonly walletControl = this.form.controls.walletId;
  readonly scheduleControl = this.form.controls.schedule;
  readonly startDateControl = this.form.controls.startDate;
  readonly selectedTags = signal<string[]>([]);
  private readonly selectedWalletCurrency = signal(this.store.defaultCurrency());
  readonly scheduleFrequency = signal<ScheduleFrequency>('monthly');
  readonly scheduleTime = signal('12:00');
  readonly scheduleDayOfWeek = signal('1');
  readonly scheduleDayOfMonth = signal(1);
  readonly walletCurrency = computed(() => this.selectedWalletCurrency());
  readonly wallets = computed<readonly WalletEntity[]>(() => this.store.wallets());
  readonly categoryView = computed(() => this.buildCategoryView());
  readonly schedulePreview = computed(() => this.buildCronSchedule());

  constructor() {
    this.nameControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const errors = this.nameControl.errors;
      if (errors?.['duplicate']) {
        const rest = { ...errors };
        delete rest['duplicate'];
        const remainingErrors = Object.keys(rest).length > 0 ? rest : null;
        this.nameControl.setErrors(remainingErrors);
      }

      const duplicateMessage = this.transloco.translate('modules.recurringPayments.form.notifications.duplicateName');
      if (this.submissionError() === duplicateMessage) {
        this.submissionError.set(null);
      }
    });

    this.amountModeControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((mode) => {
      this.syncAmountValidators(mode);
      this.submissionError.set(null);
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

      this.form.setValue(
        {
          name: editing.name,
          categoryId: editing.categoryId,
          amount: editing.amount,
          amountMode: editing.amountMode,
          walletId: editing.walletId,
          direction: editing.direction,
          startDate: this.formatDate(editing.startDate),
          endDate: editing.endDate ? this.formatDate(editing.endDate) : null,
          schedule: editing.schedule,
          tagIds,
        },
        { emitEvent: false },
      );

      this.selectedTags.set(tagIds);
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
      const current = this.selectedTags();
      const filtered = current.filter((id) => available.has(id));
      if (filtered.length !== current.length) {
        this.selectedTags.set(filtered);
        this.form.controls.tagIds.setValue(filtered, { emitEvent: false });
        return;
      }
      this.form.controls.tagIds.setValue(current, { emitEvent: false });
    });

    effect(() => {
      if (this.store.isEditing()) {
        return;
      }

      this.resetForm();
    });

    this.walletControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((walletId) => {
      this.syncWalletCurrency(typeof walletId === 'string' ? walletId : null);
      this.submissionError.set(null);
    });

    effect(() => {
      const wallets = this.wallets();
      const currentWalletId = this.walletControl.value;
      if (!wallets.some((wallet) => wallet.id === currentWalletId)) {
        const fallback = this.store.defaultWalletId() ?? wallets[0]?.id ?? '';
        this.walletControl.setValue(fallback, { emitEvent: false });
        this.syncWalletCurrency(fallback);
        return;
      }
      this.syncWalletCurrency(typeof currentWalletId === 'string' ? currentWalletId : null);
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.store.mutationPending()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submissionError.set(null);

    const { name, categoryId, amount, amountMode, direction, startDate, endDate, schedule, walletId } = this.form.value;
    const resolvedAmountMode = amountMode ?? 'fixed';

    if (resolvedAmountMode === 'fixed' && amount == null) {
      this.submissionError.set(this.transloco.translate('modules.recurringPayments.form.fields.amount.error'));
      return;
    }

    const resolvedWalletId = (walletId ?? '').trim();
    if (!resolvedWalletId) {
      this.walletControl.setErrors({ required: true });
      this.walletControl.markAsTouched();
      return;
    }

    const tags = this.selectedTags();

    const editing = this.store.editingRecurring();
    const payload = {
      name: name?.trim() ?? '',
      categoryId: categoryId ?? '',
      amount: resolvedAmountMode === 'variable' ? 0 : Number(amount),
      amountMode: resolvedAmountMode,
      direction: (direction ?? 'expense') as RecurringTransactionDirection,
      startDate: startDate ?? this.formatDate(this.today),
      endDate: endDate && endDate.length > 0 ? endDate : null,
      schedule: this.buildCronSchedule() || schedule || '',
      tagIds: tags,
      walletId: resolvedWalletId,
    };

    try {
      if (editing) {
        await this.store.updateRecurringTransaction(editing.id, payload);
      } else {
        await this.store.createRecurringTransaction(payload);
      }

      this.resetForm();
      this.dismiss.emit();
    } catch (error) {
      console.error('[RecurringPaymentForm] submission failed', error);
      const storeError = this.store.mutationError();
      if (storeError === 'modules.recurringPayments.form.notifications.duplicateName') {
        const duplicateMessage = this.transloco.translate(storeError);
        this.submissionError.set(duplicateMessage);
        this.nameControl.setErrors({ ...(this.nameControl.errors ?? {}), duplicate: true });
        this.nameControl.markAsTouched();
        this.nameControl.markAsDirty();
        return;
      }

      const shouldTranslate =
        !!storeError && (storeError.startsWith('modules.') || storeError.startsWith('common.'));
      const message = shouldTranslate ? this.transloco.translate(storeError) : storeError;

      this.submissionError.set(
        message ?? this.transloco.translate('modules.recurringPayments.form.notifications.error'),
      );
    }
  }

  dismissError(): void {
    this.submissionError.set(null);
  }

  toggleTag(tagId: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement | null;
    if (!checkbox) {
      return;
    }

    const current = this.selectedTags();
    const next = checkbox.checked
      ? current.includes(tagId)
        ? current
        : [...current, tagId]
      : current.filter((id) => id !== tagId);

    this.selectedTags.set(next);
    this.form.controls.tagIds.setValue(next, { emitEvent: false });
  }

  onDismiss(): void {
    this.dismiss.emit();
  }

  updateScheduleFrequency(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const value = target?.value;
    if (value === 'daily' || value === 'weekly' || value === 'monthly') {
      this.scheduleFrequency.set(value);
      this.syncScheduleControl();
    }
  }

  updateScheduleTime(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.scheduleTime.set(this.normalizeTime(target?.value ?? '12:00'));
    this.syncScheduleControl();
  }

  updateScheduleDayOfWeek(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    this.scheduleDayOfWeek.set(target?.value ?? '1');
    this.syncScheduleControl();
  }

  updateScheduleDayOfMonth(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const parsed = Number(target?.value ?? 1);
    const day = Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 31) : 1;
    this.scheduleDayOfMonth.set(day);
    this.syncScheduleControl();
  }

  private resetForm(): void {
    const defaultWalletId = this.store.defaultWalletId();
    this.form.reset(
      {
        name: '',
        categoryId: '',
        amount: null,
        amountMode: 'fixed',
        walletId: defaultWalletId ?? '',
        direction: 'expense',
        startDate: this.formatDate(this.today),
        endDate: null,
        schedule: '0 12 1 * *',
        tagIds: [],
      },
      { emitEvent: false },
    );
    this.selectedTags.set([]);
    this.submissionError.set(null);
    this.form.controls.tagIds.setValue([], { emitEvent: false });
    this.scheduleFrequency.set('monthly');
    this.scheduleTime.set('12:00');
    this.scheduleDayOfWeek.set('1');
    this.scheduleDayOfMonth.set(1);
    this.syncAmountValidators('fixed');
    this.syncScheduleControl();
    this.syncWalletCurrency(defaultWalletId);
  }

  private syncWalletCurrency(walletId: string | null | undefined): void {
    const wallets = this.store.wallets();
    const wallet = walletId ? wallets.find((item) => item.id === walletId) ?? null : null;
    const currency = wallet?.currency ?? this.store.defaultCurrency();
    this.selectedWalletCurrency.set(currency);
  }

  private buildCategoryView(): readonly {
    groupName: string | null;
    options: readonly CategoryOption[];
  }[] {
    const categories = this.store.categories();
    const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

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
                label: this.buildCategoryLabel(category, categories, categoryNames),
              })),
            },
          ]
        : [];

    return [...groupedView, ...ungroupedView];
  }

  private buildCategoryLabel(
    category: RecurringCategorySummary,
    categories: readonly RecurringCategorySummary[],
    categoryNames: ReadonlyMap<string, string>,
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
    const [hourPart, minutePart] = this.scheduleTime().split(':');
    const hour = this.clampCronNumber(hourPart, 0, 23, 12);
    const minute = this.clampCronNumber(minutePart, 0, 59, 0);

    if (this.scheduleFrequency() === 'daily') {
      return `${minute} ${hour} * * *`;
    }

    if (this.scheduleFrequency() === 'weekly') {
      return `${minute} ${hour} * * ${this.scheduleDayOfWeek()}`;
    }

    return `${minute} ${hour} ${this.scheduleDayOfMonth()} * *`;
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

    this.scheduleTime.set(`${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`);
    if (dayOfMonth === '*' && dayOfWeek === '*') {
      this.scheduleFrequency.set('daily');
    } else if (dayOfMonth === '*' && dayOfWeek !== '*') {
      this.scheduleFrequency.set('weekly');
      this.scheduleDayOfWeek.set(dayOfWeek);
    } else {
      this.scheduleFrequency.set('monthly');
      this.scheduleDayOfMonth.set(this.clampCronNumber(dayOfMonth, 1, 31, 1));
    }

    this.syncScheduleControl();
  }

  private syncScheduleControl(): void {
    this.scheduleControl.setValue(this.buildCronSchedule(), { emitEvent: false });
  }

  private syncAmountValidators(mode: RecurringAmountMode): void {
    if (mode === 'variable') {
      this.amountControl.clearValidators();
      this.amountControl.setValue(null, { emitEvent: false });
      this.amountControl.disable({ emitEvent: false });
    } else {
      this.amountControl.enable({ emitEvent: false });
      this.amountControl.setValidators([Validators.required, Validators.min(0.01)]);
    }

    this.amountControl.updateValueAndValidity({ emitEvent: false });
  }

  private normalizeTime(value: string): string {
    const [hourPart, minutePart] = value.split(':');
    const hour = `${this.clampCronNumber(hourPart, 0, 23, 12)}`.padStart(2, '0');
    const minute = `${this.clampCronNumber(minutePart, 0, 59, 0)}`.padStart(2, '0');
    return `${hour}:${minute}`;
  }

  private clampCronNumber(value: string | number | undefined, min: number, max: number, fallback: number): number {
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
}

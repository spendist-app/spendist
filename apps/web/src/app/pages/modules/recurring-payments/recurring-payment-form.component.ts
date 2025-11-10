import { CommonModule } from '@angular/common';
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
  RecurringTransactionDirection,
  WalletEntity,
} from './recurring-payments.store';

type RecurringFormGroup = FormGroup<{
  readonly name: FormControl<string>;
  readonly categoryId: FormControl<string>;
  readonly amount: FormControl<number | null>;
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
  imports: [CommonModule, ReactiveFormsModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <section class="fixed inset-0 z-40 flex items-end justify-center px-4 py-6 sm:items-center sm:py-12 lg:py-16">
        <div class="absolute inset-0 bg-base-200/70 backdrop-blur-sm" (click)="onDismiss()" aria-hidden="true"></div>

        <div
          class="relative z-10 w-full max-w-3xl overflow-hidden rounded-t-3xl border border-base-300 bg-base-100/95 shadow-2xl backdrop-blur sm:rounded-3xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recurring-payment-form-title"
        >
          <form
            class="flex max-h-[min(88vh,700px)] flex-col gap-6 overflow-y-auto p-6 sm:p-8"
            [formGroup]="form"
            (ngSubmit)="onSubmit()"
            autocomplete="off"
            novalidate
          >
            <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p class="badge badge-primary badge-outline text-xs uppercase tracking-wide">
                  {{ 'modules.recurringPayments.form.badge' | transloco }}
                </p>
                <h2 id="recurring-payment-form-title" class="mt-2 text-2xl font-semibold sm:text-3xl">
                  {{
                    (store.isEditing()
                      ? 'modules.recurringPayments.form.editTitle'
                      : 'modules.recurringPayments.form.title') | transloco
                  }}
                </h2>
                <p class="mt-1 max-w-2xl text-sm text-base-content/70">
                  {{
                    (store.isEditing()
                      ? 'modules.recurringPayments.form.editSubtitle'
                      : 'modules.recurringPayments.form.subtitle') | transloco
                  }}
                </p>
              </div>

              <button type="button" class="btn btn-ghost btn-sm self-end sm:self-start" (click)="onDismiss()">
                {{ 'common.actions.close' | transloco }}
              </button>
            </header>

            @if (submissionError()) {
              <div class="alert alert-error flex items-start gap-3 rounded-2xl border border-error/20 bg-error/10 p-4 text-sm">
                <span class="flex-1">{{ submissionError() }}</span>
                <button type="button" class="btn btn-ghost btn-xs text-error" (click)="dismissError()">
                  {{ 'common.actions.dismiss' | transloco }}
                </button>
              </div>
            }

            <div class="grid gap-4">
              <div class="grid gap-2">
                <label class="text-sm font-semibold text-base-content" for="recurring-name">
                  {{ 'modules.recurringPayments.form.fields.name.label' | transloco }}
                </label>
                <input
                  id="recurring-name"
                  class="input input-bordered w-full"
                  type="text"
                  formControlName="name"
                  [attr.placeholder]="'modules.recurringPayments.form.fields.name.placeholder' | transloco"
                  autocomplete="off"
                />
                @if (nameControl.invalid && (nameControl.dirty || nameControl.touched)) {
                  @if (nameControl.hasError('duplicate')) {
                    <p class="text-xs text-error">
                      {{ 'modules.recurringPayments.form.fields.name.duplicate' | transloco }}
                    </p>
                  } @else {
                    <p class="text-xs text-error">
                      {{ 'modules.recurringPayments.form.fields.name.error' | transloco }}
                    </p>
                  }
                }
              </div>

              <div class="grid gap-2">
                <label class="text-sm font-semibold text-base-content" for="recurring-category">
                  {{ 'modules.recurringPayments.form.fields.category.label' | transloco }}
                </label>
                <select id="recurring-category" class="select select-bordered w-full" formControlName="categoryId">
                  <option value="">
                    {{ 'modules.recurringPayments.form.fields.category.placeholder' | transloco }}
                  </option>
                  @for (category of store.categories(); track category.id) {
                    <option [ngValue]="category.id">{{ category.name }}</option>
                  }
                </select>
                @if (categoryControl.invalid && (categoryControl.dirty || categoryControl.touched)) {
                  <p class="text-xs text-error">
                    {{ 'modules.recurringPayments.form.fields.category.error' | transloco }}
                  </p>
                }
              </div>

              <div class="grid gap-2">
                <label class="text-sm font-semibold text-base-content" for="recurring-wallet">
                  {{ 'modules.recurringPayments.form.fields.wallet.label' | transloco }}
                </label>
                <select id="recurring-wallet" class="select select-bordered w-full" formControlName="walletId">
                  <option value="">
                    {{ 'modules.recurringPayments.form.fields.wallet.placeholder' | transloco }}
                  </option>
                  @for (wallet of wallets(); track wallet.id) {
                    <option [value]="wallet.id">{{ wallet.name }}</option>
                  }
                </select>
                @if (walletControl.invalid && (walletControl.dirty || walletControl.touched)) {
                  <p class="text-xs text-error">
                    {{ 'modules.recurringPayments.form.fields.wallet.error' | transloco }}
                  </p>
                }
                <p class="text-xs text-base-content/60">
                  {{ 'modules.recurringPayments.form.fields.wallet.currencyHint' | transloco:{ currency: walletCurrency() } }}
                </p>
              </div>

              <div class="grid gap-2">
                <label class="text-sm font-semibold text-base-content" for="recurring-amount">
                  {{ 'modules.recurringPayments.form.fields.amount.label' | transloco }}
                </label>
                <div class="join w-full">
                  <input
                    id="recurring-amount"
                    class="input join-item input-bordered flex-1 min-w-0"
                    type="number"
                    min="0"
                    step="0.01"
                    formControlName="amount"
                    autocomplete="off"
                  />
                  <div class="join-item flex items-center bg-base-200 px-3 text-sm font-semibold uppercase text-base-content">
                    {{ walletCurrency() }}
                  </div>
                </div>
                @if (amountControl.invalid && (amountControl.dirty || amountControl.touched)) {
                  <p class="text-xs text-error">
                    {{ 'modules.recurringPayments.form.fields.amount.error' | transloco }}
                  </p>
                }
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="grid gap-2">
                  <label class="text-sm font-semibold text-base-content" for="recurring-direction">
                    {{ 'modules.recurringPayments.form.fields.direction.label' | transloco }}
                  </label>
                  <select id="recurring-direction" class="select select-bordered w-full" formControlName="direction">
                    <option value="expense">
                      {{ 'modules.recurringPayments.form.fields.direction.options.expense' | transloco }}
                    </option>
                    <option value="income">
                      {{ 'modules.recurringPayments.form.fields.direction.options.income' | transloco }}
                    </option>
                  </select>
                </div>

                <div class="grid gap-2">
                  <label class="text-sm font-semibold text-base-content" for="recurring-schedule">
                    {{ 'modules.recurringPayments.form.fields.schedule.label' | transloco }}
                  </label>
                  <input
                    id="recurring-schedule"
                    class="input input-bordered w-full"
                    type="text"
                    formControlName="schedule"
                    autocomplete="off"
                    [attr.placeholder]="'modules.recurringPayments.form.fields.schedule.placeholder' | transloco"
                  />
                  @if (scheduleControl.invalid && (scheduleControl.dirty || scheduleControl.touched)) {
                    <p class="text-xs text-error">
                      {{ 'modules.recurringPayments.form.fields.schedule.error' | transloco }}
                    </p>
                  }
                  <p class="text-xs text-base-content/60">
                    {{ 'modules.recurringPayments.form.fields.schedule.hint' | transloco }}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="grid gap-2">
                  <label class="text-sm font-semibold text-base-content" for="recurring-start-date">
                    {{ 'modules.recurringPayments.form.fields.startDate.label' | transloco }}
                  </label>
                  <input id="recurring-start-date" class="input input-bordered" type="date" formControlName="startDate" />
                  @if (startDateControl.invalid && (startDateControl.dirty || startDateControl.touched)) {
                    <p class="text-xs text-error">
                      {{ 'modules.recurringPayments.form.fields.startDate.error' | transloco }}
                    </p>
                  }
                </div>

                <div class="grid gap-2">
                  <label class="text-sm font-semibold text-base-content" for="recurring-end-date">
                    {{ 'modules.recurringPayments.form.fields.endDate.label' | transloco }}
                    <span class="text-xs text-base-content/60">
                      {{ 'modules.recurringPayments.form.fields.endDate.optional' | transloco }}
                    </span>
                  </label>
                  <input id="recurring-end-date" class="input input-bordered" type="date" formControlName="endDate" />
                </div>
              </div>

              <fieldset class="grid gap-2">
                <legend class="text-sm font-semibold text-base-content">
                  {{ 'modules.recurringPayments.form.fields.tags.label' | transloco }}
                </legend>
                <p class="text-xs text-base-content/60">
                  {{ 'modules.recurringPayments.form.fields.tags.hint' | transloco }}
                </p>
                <div class="flex flex-wrap gap-2">
                  @if (store.tags().length === 0) {
                    <span class="badge badge-ghost text-xs">
                      {{ 'modules.recurringPayments.form.fields.tags.empty' | transloco }}
                    </span>
                  } @else {
                    @for (tag of store.tags(); track tag.id) {
                      <label class="flex cursor-pointer items-center gap-2 rounded-full border border-base-200 px-3 py-1 text-sm">
                        <input
                          type="checkbox"
                          class="checkbox checkbox-sm"
                          [checked]="selectedTags().includes(tag.id)"
                          (change)="toggleTag(tag.id, $event)"
                        />
                        <span>{{ tag.name }}</span>
                      </label>
                    }
                  }
                </div>
              </fieldset>
            </div>

            <footer class="flex items-center justify-end gap-3 pt-2">
              <button type="button" class="btn btn-ghost" (click)="onDismiss()" [disabled]="store.mutationPending()">
                {{ 'common.actions.cancel' | transloco }}
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="form.invalid || store.mutationPending()"
                data-testid="recurring-submit"
              >
                @if (store.mutationPending()) {
                  <span class="loading loading-spinner loading-xs"></span>
                }
                <span>
                  {{
                    (store.isEditing()
                      ? 'modules.recurringPayments.form.actions.update'
                      : 'modules.recurringPayments.form.actions.submit') | transloco
                  }}
                </span>
              </button>
            </footer>
          </form>
        </div>
      </section>
    }
  `,
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
  readonly walletControl = this.form.controls.walletId;
  readonly scheduleControl = this.form.controls.schedule;
  readonly startDateControl = this.form.controls.startDate;
  readonly selectedTags = signal<string[]>([]);
  private readonly selectedWalletCurrency = signal(this.store.defaultCurrency());
  readonly walletCurrency = computed(() => this.selectedWalletCurrency());
  readonly wallets = computed<readonly WalletEntity[]>(() => this.store.wallets());

  constructor() {
    this.nameControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const errors = this.nameControl.errors;
      if (errors?.['duplicate']) {
        const { duplicate: _omit, ...rest } = errors;
        const remainingErrors = Object.keys(rest).length > 0 ? rest : null;
        this.nameControl.setErrors(remainingErrors);
      }

      const duplicateMessage = this.transloco.translate('modules.recurringPayments.form.notifications.duplicateName');
      if (this.submissionError() === duplicateMessage) {
        this.submissionError.set(null);
      }
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

    const { name, categoryId, amount, direction, startDate, endDate, schedule, walletId } = this.form.value;

    if (amount == null) {
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
      amount: Number(amount),
      direction: (direction ?? 'expense') as RecurringTransactionDirection,
      startDate: startDate ?? this.formatDate(this.today),
      endDate: endDate && endDate.length > 0 ? endDate : null,
      schedule: schedule ?? '',
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

  private resetForm(): void {
    const defaultWalletId = this.store.defaultWalletId();
    this.form.reset(
      {
        name: '',
        categoryId: '',
        amount: null,
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
    this.syncWalletCurrency(defaultWalletId);
  }

  private syncWalletCurrency(walletId: string | null | undefined): void {
    const wallets = this.store.wallets();
    const wallet = walletId ? wallets.find((item) => item.id === walletId) ?? null : null;
    const currency = wallet?.currency ?? this.store.defaultCurrency();
    this.selectedWalletCurrency.set(currency);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

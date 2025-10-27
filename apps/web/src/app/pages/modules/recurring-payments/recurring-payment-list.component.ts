import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { RecurringPaymentsStore, RecurringTransactionEntity } from './recurring-payments.store';

@Component({
  standalone: true,
  selector: 'app-recurring-payment-list',
  imports: [CommonModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rounded-3xl border border-base-200 bg-base-100/80 p-6 shadow-sm">
      <header class="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-wide text-primary">
            {{ 'modules.recurringPayments.list.badge' | transloco }}
          </p>
          <h2 class="text-xl font-semibold">
            {{ 'modules.recurringPayments.list.title' | transloco }}
          </h2>
          <p class="text-sm text-base-content/70">
            {{ 'modules.recurringPayments.list.subtitle' | transloco }}
          </p>
        </div>
      </header>

      @if (store.loading()) {
        <div class="flex min-h-32 items-center justify-center">
          <span class="loading loading-spinner text-primary"></span>
        </div>
      } @else if (store.error()) {
        <div class="alert alert-error bg-error/10 text-sm">
          {{ store.error() }}
        </div>
      } @else if (store.empty()) {
        <div class="grid min-h-32 place-items-center rounded-2xl border border-dashed border-base-300 bg-base-100/70 p-8 text-center">
          <div class="space-y-2">
            <h3 class="text-lg font-semibold">
              {{ 'modules.recurringPayments.list.empty.title' | transloco }}
            </h3>
            <p class="text-sm text-base-content/60">
              {{ 'modules.recurringPayments.list.empty.body' | transloco }}
            </p>
            <button type="button" class="btn btn-primary btn-sm" (click)="createRequested.emit()">
              {{ 'modules.recurringPayments.actions.add' | transloco }}
            </button>
          </div>
        </div>
      } @else {
        <ul class="grid gap-3">
          @for (transaction of transactions(); track transaction.id) {
            <li
              class="rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm transition hover:border-primary/40"
              [class.border-primary]="isEditing(transaction)"
              [class.bg-primary/5]="isEditing(transaction)"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <h3 class="text-lg font-semibold">{{ transaction.name }}</h3>
                    <span class="badge badge-outline text-xs uppercase">
                      {{ linkDirectionLabel(transaction.direction) | transloco }}
                    </span>
                  </div>
                  <div class="text-sm text-base-content/70">
                    <span>{{ 'modules.recurringPayments.list.fields.schedule' | transloco }}:</span>
                    <code class="rounded bg-base-200 px-2 py-0.5">{{ transaction.schedule }}</code>
                  </div>
                  <div class="flex flex-wrap gap-3 text-sm text-base-content/70">
                    <span>
                      {{ 'modules.recurringPayments.list.fields.startDate' | transloco }}:
                      <strong class="text-base-content">{{ transaction.startDate | date: 'longDate' }}</strong>
                    </span>
                    @if (transaction.endDate) {
                      <span>
                        {{ 'modules.recurringPayments.list.fields.endDate' | transloco }}:
                        <strong class="text-base-content">{{ transaction.endDate | date: 'longDate' }}</strong>
                      </span>
                    } @else {
                      <span>
                        {{ 'modules.recurringPayments.list.fields.endDate' | transloco }}:
                        <strong class="text-base-content/70">
                          {{ 'modules.recurringPayments.list.fields.noEndDate' | transloco }}
                        </strong>
                      </span>
                    }
                  </div>
                  <div class="flex flex-wrap items-center gap-2 text-sm">
                    @if (transaction.category) {
                      <span class="badge badge-ghost text-xs">
                        {{ transaction.category.name }}
                      </span>
                    }
                    @for (tag of transaction.tags; track tag.id) {
                      <span class="badge badge-outline text-xs">{{ tag.name }}</span>
                    }
                  </div>
                </div>
                <div class="flex flex-col items-end gap-3">
                  <div class="text-right">
                    <p class="text-2xl font-semibold text-primary">
                      {{ transaction.amount | number: '1.2-2' }}
                      <span class="text-sm font-medium text-base-content/80">{{ transaction.currency }}</span>
                    </p>
                    @if (transaction.exchangeRate) {
                      <p class="text-xs text-base-content/60">
                        {{ 'modules.recurringPayments.list.fields.exchangeRate' | transloco }}:
                        {{ transaction.exchangeRate | number: '1.2-4' }}
                      </p>
                    }
                  </div>
                  <div class="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      (click)="beginEdit(transaction)"
                      [disabled]="store.mutationPending()"
                    >
                      {{ 'modules.recurringPayments.list.actions.edit' | transloco }}
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm text-error"
                      (click)="confirmDelete(transaction)"
                      [disabled]="store.mutationPending()"
                    >
                      {{ 'modules.recurringPayments.list.actions.delete' | transloco }}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class RecurringPaymentListComponent {
  readonly store = inject(RecurringPaymentsStore);
  private readonly transloco = inject(TranslocoService);
  readonly editRequested = output<void>();
  readonly createRequested = output<void>();

  readonly transactions = computed(() =>
    this.store
      .recurringTransactions()
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  linkDirectionLabel(direction: RecurringTransactionEntity['direction']): string {
    return direction === 'income'
      ? 'modules.recurringPayments.list.direction.income'
      : 'modules.recurringPayments.list.direction.expense';
  }

  isEditing(transaction: RecurringTransactionEntity): boolean {
    const editing = this.store.editingRecurring();
    return !!editing && editing.id === transaction.id;
  }

  beginEdit(transaction: RecurringTransactionEntity): void {
    this.store.startEditing(transaction.id);
    this.editRequested.emit();
  }

  async confirmDelete(transaction: RecurringTransactionEntity): Promise<void> {
    const message = this.transloco.translate('modules.recurringPayments.list.confirmDelete', {
      name: transaction.name,
    });
    const shouldDelete = window.confirm(message);
    if (!shouldDelete) {
      return;
    }

    try {
      await this.store.deleteRecurringTransaction(transaction.id);
    } catch (error) {
      console.error('[RecurringPaymentList] delete failed', error);
    }
  }
}

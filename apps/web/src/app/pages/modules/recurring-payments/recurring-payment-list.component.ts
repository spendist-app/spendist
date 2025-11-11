import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { RecurringPaymentsStore, RecurringTransactionEntity } from './recurring-payments.store';

@Component({
  standalone: true,
  selector: 'app-recurring-payment-list',
  imports: [CommonModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recurring-payment-list.component.html',
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

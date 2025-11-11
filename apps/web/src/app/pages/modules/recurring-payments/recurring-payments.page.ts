import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@ngneat/transloco';
import { RecurringPaymentFormComponent } from './recurring-payment-form.component';
import { RecurringPaymentListComponent } from './recurring-payment-list.component';
import { RecurringPaymentsStore } from './recurring-payments.store';

@Component({
  standalone: true,
  selector: 'app-recurring-payments-page',
  imports: [CommonModule, TranslocoPipe, RecurringPaymentFormComponent, RecurringPaymentListComponent],
  providers: [RecurringPaymentsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recurring-payments.page.html',
})
export class RecurringPaymentsPageComponent {
  readonly store = inject(RecurringPaymentsStore);
  readonly formOpen = signal(false);

  openForm(): void {
    this.formOpen.set(true);
  }

  startCreate(): void {
    this.store.cancelEditing();
    this.openForm();
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.store.cancelEditing();
  }
}

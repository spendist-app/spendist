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
  template: `
    <section class="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-5xl flex-col gap-4 px-4 py-12 sm:py-16">
      <section class="grid gap-4 sm:grid-cols-2">
        <article class="rounded-3xl border border-base-200 bg-base-100/80 p-6 shadow-sm">
          <p class="text-xs uppercase tracking-wide text-base-content/60">
            {{ 'modules.recurringPayments.stats.monthly.label' | transloco }}
          </p>
          <p class="mt-2 text-3xl font-semibold text-primary">
            {{ store.stats().monthlyExpense | number: '1.2-2' }}
            <span class="text-base text-base-content/70">{{ store.defaultCurrency() }}</span>
          </p>
          <p class="mt-1 text-sm text-base-content/60">
            {{ 'modules.recurringPayments.stats.monthly.caption' | transloco }}
          </p>
        </article>
        <article class="rounded-3xl border border-base-200 bg-base-100/80 p-6 shadow-sm">
          <p class="text-xs uppercase tracking-wide text-base-content/60">
            {{ 'modules.recurringPayments.stats.yearly.label' | transloco }}
          </p>
          <p class="mt-2 text-3xl font-semibold text-primary">
            {{ store.stats().yearlyExpense | number: '1.2-2' }}
            <span class="text-base text-base-content/70">{{ store.defaultCurrency() }}</span>
          </p>
          <p class="mt-1 text-sm text-base-content/60">
            {{ 'modules.recurringPayments.stats.yearly.caption' | transloco }}
          </p>
        </article>
      </section>

      <section class="relative flex-1">
        <app-recurring-payment-list class="h-full" (editRequested)="openForm()" (createRequested)="startCreate()" />

        <button
          type="button"
          class="btn btn-primary btn-circle fixed bottom-6 right-6 z-20 shadow-lg transition hover:scale-110 focus-visible:scale-110 sm:bottom-10 sm:right-10"
          (click)="startCreate()"
          aria-label="{{ 'modules.recurringPayments.form.badge' | transloco }}"
        >
          <span class="text-2xl leading-none">+</span>
        </button>
      </section>

      <app-recurring-payment-form [open]="formOpen()" (dismiss)="closeForm()" />
    </section>
  `,
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

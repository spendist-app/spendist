import {
  Directive,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
} from '@angular/core';
import { FormErrorAnnouncer } from './form-error-announcer.service';

/**
 * After a submit that leaves errors on screen, moves focus to the first field
 * marked invalid (`aria-invalid="true"`, for example by `FieldErrorDirective`),
 * so a screen reader reads that field's error. Angular forms are `novalidate`,
 * so the browser does not do this itself.
 *
 * ```html
 * <form [formGroup]="form" appFocusFirstInvalid (ngSubmit)="save()">
 * ```
 */
@Directive({
  selector: 'form[appFocusFirstInvalid]',
  host: { '(submit)': 'onSubmit()' },
})
export class FocusFirstInvalidFieldDirective {
  private readonly form =
    inject<ElementRef<HTMLFormElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly announcer = inject(FormErrorAnnouncer);

  protected onSubmit(): void {
    afterNextRender(
      {
        write: () => {
          const field = this.form.querySelector<HTMLElement>(
            '[aria-invalid="true"]'
          );

          if (!field) {
            return;
          }

          // Focus reads the field's error; drop the blur announcement of the
          // field the user submitted from.
          this.announcer.clear();
          field.focus();
        },
      },
      { injector: this.injector }
    );
  }
}

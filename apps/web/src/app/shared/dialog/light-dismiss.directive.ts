import { Directive, ElementRef, inject } from '@angular/core';

/**
 * Closes a modal `<dialog class="modal">` when the user clicks the dimmed
 * area around its content (light dismiss).
 *
 * `closedby="any"` cannot do this here: a DaisyUI `.modal` dialog covers the
 * whole viewport and hides `::backdrop`, so a click on the dimmed area hits
 * the dialog element itself, which the browser treats as inside the dialog.
 *
 * The press must start and end on the dialog element. A text selection that
 * starts inside the content and ends outside it fires `click` on the dialog
 * too, and must not close it.
 *
 * Use it only on dialogs without unsaved input; form dialogs keep closing
 * through their buttons and `Esc`.
 */
@Directive({
  selector: 'dialog[appLightDismiss]',
  host: {
    '(pointerdown)': 'onPointerDown($event)',
    '(click)': 'onClick($event)',
  },
})
export class LightDismissDirective {
  private readonly dialog =
    inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;

  private pressStartedOnBackdrop = false;

  protected onPointerDown(event: PointerEvent): void {
    this.pressStartedOnBackdrop = event.target === this.dialog;
  }

  protected onClick(event: MouseEvent): void {
    const startedOnBackdrop = this.pressStartedOnBackdrop;

    this.pressStartedOnBackdrop = false;

    if (!startedOnBackdrop || event.target !== this.dialog) return;

    // requestClose() fires `cancel` first, like Esc; older browsers close.
    if (typeof this.dialog.requestClose === 'function') {
      this.dialog.requestClose();
    } else {
      this.dialog.close();
    }
  }
}

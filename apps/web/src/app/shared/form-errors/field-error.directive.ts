import {
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  afterEveryRender,
  inject,
  input,
} from '@angular/core';
import { FormErrorAnnouncer } from './form-error-announcer.service';

/**
 * Keeps a field's accessibility state in step with its visible error message.
 *
 * `appFieldError` names the id of the field's error element. The field counts
 * as invalid exactly while that element is rendered, whatever condition the
 * template uses to show it, so screen reader users learn about an error at
 * the same moment it appears on screen:
 *
 * - `aria-invalid` is "true" while the error is shown and "false" otherwise
 *   (not unset: Firefox and Safari expose an empty required field as invalid
 *   from page load);
 * - the error id is added to `aria-describedby` only while it is shown;
 * - an error shown when the user leaves the field is announced once through
 *   the shared polite live region.
 *
 * ```html
 * <input formControlName="email" appFieldError="login-email-error" />
 * @if (controls.email.touched && controls.email.invalid) {
 *   <span id="login-email-error">…</span>
 * }
 * ```
 */
@Directive({
  selector: '[appFieldError]',
  host: { '(blur)': 'onBlur()' },
})
export class FieldErrorDirective {
  readonly errorId = input.required<string>({ alias: 'appFieldError' });

  private readonly field =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly announcer = inject(FormErrorAnnouncer);
  private readonly baseDescribedBy = idList(
    this.field.getAttribute('aria-describedby')
  );
  private shown: boolean | null = null;
  private announced = false;

  constructor() {
    afterEveryRender({ write: () => this.sync() });
    inject(DestroyRef).onDestroy(() => this.announcer.clear(this.field));
  }

  protected onBlur(): void {
    this.announcer.schedule(this.field, () => {
      const error = this.errorElement();

      // An error that is its own live region announces itself.
      if (!error || this.announced || isLiveRegion(error)) {
        return null;
      }

      this.announced = true;

      return [accessibleLabel(this.field), spokenText(error)]
        .filter(Boolean)
        .join(': ');
    });
  }

  private sync(): void {
    const shown = this.errorElement() !== null;

    if (shown === this.shown) {
      return;
    }

    this.shown = shown;
    this.field.setAttribute('aria-invalid', String(shown));

    const describedBy = shown
      ? [...this.baseDescribedBy, this.errorId()]
      : this.baseDescribedBy;

    if (describedBy.length > 0) {
      this.field.setAttribute('aria-describedby', describedBy.join(' '));
    } else {
      this.field.removeAttribute('aria-describedby');
    }

    if (!shown) {
      this.announced = false;
      this.announcer.clear(this.field);
    }
  }

  private errorElement(): HTMLElement | null {
    return this.document.getElementById(this.errorId());
  }
}

function idList(value: string | null): string[] {
  return (value ?? '').split(/\s+/).filter(Boolean);
}

function isLiveRegion(element: HTMLElement): boolean {
  const role = element.getAttribute('role');
  const live = element.getAttribute('aria-live');

  return role === 'alert' || role === 'status' || (!!live && live !== 'off');
}

function accessibleLabel(field: HTMLElement): string {
  const ariaLabel = field.getAttribute('aria-label')?.trim();

  if (ariaLabel) {
    return ariaLabel;
  }

  const label =
    field instanceof HTMLInputElement ||
    field instanceof HTMLSelectElement ||
    field instanceof HTMLTextAreaElement
      ? field.labels?.[0]
      : undefined;

  if (!label) {
    return '';
  }

  // A label that wraps the field also wraps its help and error text; leave
  // those (and the controls) out of the field's name.
  const described = new Set(idList(field.getAttribute('aria-describedby')));

  return spokenText(
    label,
    (element) =>
      described.has(element.id) ||
      element.matches('input, select, textarea, button')
  );
}

/**
 * Text as a screen reader reads it: aria-hidden content (and anything
 * `exclude` matches) left out.
 */
function spokenText(
  node: HTMLElement,
  exclude: (element: Element) => boolean = () => false
): string {
  const copy = node.cloneNode(true);

  if (!(copy instanceof HTMLElement)) {
    return '';
  }

  copy.querySelectorAll('*').forEach((element) => {
    if (element.getAttribute('aria-hidden') === 'true' || exclude(element)) {
      element.remove();
    }
  });

  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim();
}

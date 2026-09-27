import type { ComponentFixture } from '@angular/core/testing';

/** Return the real DOM root so selector types remain checked in component tests. */
export function fixtureElement<T>(fixture: ComponentFixture<T>): HTMLElement {
  const element = fixture.nativeElement;

  if (!(element instanceof HTMLElement)) {
    throw new Error('Expected an HTML root for the component fixture.');
  }

  return element;
}

/** Dispatch through a real control so handlers receive a genuine DOM target. */
export function changeEvent(value: string, kind: 'input' | 'select'): Event {
  const target = document.createElement(kind);

  if (target instanceof HTMLSelectElement) target.add(new Option(value, value));
  target.value = value;
  const event = new Event('change', { bubbles: true });
  target.dispatchEvent(event);

  return event;
}

/** jsdom implements Event, but does not provide ClipboardEvent/DataTransfer. */
export function pasteEvent(text: string): ClipboardEvent {
  const event = new Event('paste', { cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: { getData: () => text },
  });

  // SAFETY: the paste handler only reads clipboardData.getData and Event.preventDefault; both are installed above.
  return event as ClipboardEvent;
}

/** Fail at the missing fixture value instead of deferring a null dereference. */
export function requiredValue<T>(value: T | null | undefined): T {
  if (value == null)
    throw new Error('Expected the test fixture value to exist.');

  return value;
}

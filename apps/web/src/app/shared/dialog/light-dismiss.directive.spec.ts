import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fixtureElement, requiredValue } from '../../../testing/dom';
import { LightDismissDirective } from './light-dismiss.directive';

@Component({
  imports: [LightDismissDirective],
  template: `
    <dialog class="modal" appLightDismiss>
      <section><p>Content</p></section>
    </dialog>
  `,
})
class HostComponent {}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();

  const dialog = requiredValue(
    fixtureElement(fixture).querySelector<HTMLDialogElement>('dialog')
  );

  const content = requiredValue(dialog.querySelector('p'));
  const close = vi.fn();

  // jsdom has no showModal(); the directive only needs close to be callable.
  Object.assign(dialog, { requestClose: close, close });

  return { dialog, content, close };
}

function press(down: Element, up: Element) {
  down.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  up.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('LightDismissDirective', () => {
  it('closes the dialog after a click on the dimmed area', () => {
    const { dialog, close } = setup();

    press(dialog, dialog);

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('stays open after a click on the content', () => {
    const { content, close } = setup();

    press(content, content);

    expect(close).not.toHaveBeenCalled();
  });

  it('stays open when a text selection ends outside the content', () => {
    const { dialog, content, close } = setup();

    press(content, dialog);

    expect(close).not.toHaveBeenCalled();
  });
});

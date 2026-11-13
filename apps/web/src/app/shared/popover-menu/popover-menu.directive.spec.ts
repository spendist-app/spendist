import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fixtureElement, requiredValue } from '../../../testing/dom';
import { PopoverMenuDirective } from './popover-menu.directive';

@Component({
  imports: [PopoverMenuDirective],
  template: `
    <button #trigger type="button" aria-haspopup="menu">Actions</button>
    <ul role="menu" class="dropdown" [appPopoverMenu]="trigger">
      <li role="none"><button type="button" role="menuitem">Edit</button></li>
      <li role="none">
        <button type="button" role="menuitem" disabled>Archive</button>
      </li>
      <li role="none"><button type="button" role="menuitem">Rename</button></li>
      <li role="none"><a href="/help" role="menuitem">Help</a></li>
    </ul>
    <button #second type="button">More</button>
    <div [appPopoverMenu]="second" [appPopoverMenuArrowKeys]="false">Panel</div>
  `,
})
class MenuHostComponent {}

async function setUp() {
  const fixture = TestBed.createComponent(MenuHostComponent);

  await fixture.whenStable();

  const root = fixtureElement(fixture);

  const menu = requiredValue(root.querySelector<HTMLElement>('[role="menu"]'));

  const trigger = requiredValue(
    root.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')
  );

  const items = Array.from(
    menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')
  );

  return { root, menu, trigger, items };
}

function press(target: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });

  target.dispatchEvent(event);

  return event;
}

describe('PopoverMenuDirective', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuHostComponent],
    }).compileComponents();
  });

  it('makes the element an auto popover its trigger toggles', async () => {
    const { root, menu, trigger } = await setUp();

    const panel = requiredValue(
      root.querySelector<HTMLElement>('div[popover]')
    );

    expect(menu.getAttribute('popover')).toBe('auto');
    expect(trigger.getAttribute('commandfor')).toBe(menu.id);
    expect(trigger.getAttribute('command')).toBe('toggle-popover');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panel.id).not.toBe(menu.id);
  });

  it('moves focus between enabled items with arrow keys, Home and End', async () => {
    const { items } = await setUp();
    const [edit, rename, help] = items.map((item) => requiredValue(item));

    edit.focus();

    expect(press(edit, 'ArrowDown').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(rename);

    press(rename, 'End');
    expect(document.activeElement).toBe(help);

    press(help, 'ArrowDown');
    expect(document.activeElement).toBe(edit);

    press(edit, 'ArrowUp');
    expect(document.activeElement).toBe(help);

    press(help, 'Home');
    expect(document.activeElement).toBe(edit);
  });

  it('leaves arrow keys alone in a panel', async () => {
    const { root } = await setUp();

    const panel = requiredValue(
      root.querySelector<HTMLElement>('div[popover]')
    );

    expect(press(panel, 'ArrowDown').defaultPrevented).toBe(false);
  });
});

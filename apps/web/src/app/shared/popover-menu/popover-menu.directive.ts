import {
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
} from '@angular/core';

let nextMenuId = 0;

// Space between the trigger and the menu, and between the menu and the
// viewport edge, when anchor positioning is not available.
const FALLBACK_GAP_PX = 8;

const HOVER_CLOSE_DELAY_MS = 180;

const ITEM_SELECTOR =
  'a[href], button:not(:disabled), [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';

/**
 * A dropdown built on the Popover API, following the modern-web-guidance
 * `menu` guide. Put it on the dropdown element and pass its trigger button:
 *
 * ```html
 * <button #trigger type="button" aria-haspopup="menu">Actions</button>
 * <ul class="dropdown dropdown-end menu" [appPopoverMenu]="trigger" role="menu">…</ul>
 * ```
 *
 * - The element becomes `popover="auto"`, so it opens in the top layer (no
 *   clipping by scroll containers or dialogs, no z-index), and closes on Esc,
 *   on a click outside and when another menu opens.
 * - The trigger opens it declaratively (`commandfor` + `command`) and gets
 *   `aria-expanded`. Place the menu right after its trigger.
 * - DaisyUI `dropdown` classes on the menu place it with CSS anchor
 *   positioning (`dropdown-end`, `dropdown-top`); without anchor positioning
 *   the menu is placed from script instead of being centered on screen.
 * - With `appPopoverMenuArrowKeys` (default), it is an ARIA menu: keyboard
 *   opens move focus to the first item, arrow keys, Home and End move between
 *   items, Tab leaves and closes it. Set it to false for a panel or a short
 *   list of links users Tab through.
 * - Activating an item closes the menu (`appPopoverMenuCloseOnActivate`).
 * - With `appPopoverMenuOpenOnHover`, a mouse over the trigger previews the
 *   menu and leaving both closes it; a click right after the preview keeps it
 *   open instead of toggling it closed.
 */
@Directive({
  selector: '[appPopoverMenu]',
  exportAs: 'appPopoverMenu',
  host: {
    popover: 'auto',
    '[id]': 'menuId',
    '(toggle)': 'onToggle($event)',
    '(keydown)': 'onKeydown($event)',
    '(click)': 'onClick($event)',
  },
})
export class PopoverMenuDirective {
  readonly trigger = input.required<HTMLElement>({ alias: 'appPopoverMenu' });
  readonly arrowKeys = input(true, { alias: 'appPopoverMenuArrowKeys' });
  readonly closeOnActivate = input(true, {
    alias: 'appPopoverMenuCloseOnActivate',
  });
  readonly openOnHover = input(false, { alias: 'appPopoverMenuOpenOnHover' });

  /** Whether the menu is open. */
  readonly isOpen = signal(false);

  protected readonly menuId = `app-popover-menu-${nextMenuId++}`;

  private readonly menu =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private enterOnOpen = false;
  private openedByHover = false;
  private escapeForMenu = false;
  private hoverCloseTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const trigger = this.trigger();
      const anchor = `--${this.menuId}`;
      const onKeydown = (event: KeyboardEvent) => this.onTriggerKeydown(event);
      const onClick = (event: MouseEvent) => this.onTriggerClick(event);
      const onEnter = (event: PointerEvent) => this.onPointerEnter(event);
      const onLeave = (event: PointerEvent) => this.onPointerLeave(event);
      const hoverTargets = [trigger, this.menu];

      if (!supportsAnchorPositioning()) {
        // Opt out of the centered, dimmed popover before the first open.
        this.menu.setAttribute('data-anchor-fallback', '');
      }

      trigger.setAttribute('commandfor', this.menuId);
      trigger.setAttribute('command', 'toggle-popover');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.style.setProperty('anchor-name', anchor);
      this.menu.style.setProperty('position-anchor', anchor);
      trigger.addEventListener('keydown', onKeydown);
      trigger.addEventListener('click', onClick);

      for (const target of hoverTargets) {
        target.addEventListener('pointerenter', onEnter);
        target.addEventListener('pointerleave', onLeave);
      }

      const dialog = this.menu.closest('dialog');

      const onEscape = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') {
          return;
        }

        if (event.type === 'keydown') {
          this.escapeForMenu = this.openNow();
        } else {
          // WebKit sends the dialog its cancel in a later task: keep the flag
          // until the key is released.
          setTimeout(() => (this.escapeForMenu = false));
        }
      };

      const onDialogCancel = (event: Event) => {
        // Some engines also send a modal dialog the Esc that closes this menu.
        if (this.escapeForMenu) {
          event.preventDefault();
          this.hide();
        }
      };

      if (dialog) {
        this.document.addEventListener('keydown', onEscape, true);
        this.document.addEventListener('keyup', onEscape, true);
        dialog.addEventListener('cancel', onDialogCancel);
      }

      destroyRef.onDestroy(() => {
        this.document.removeEventListener('keydown', onEscape, true);
        this.document.removeEventListener('keyup', onEscape, true);
        dialog?.removeEventListener('cancel', onDialogCancel);
        clearTimeout(this.hoverCloseTimer);
        trigger.removeEventListener('keydown', onKeydown);
        trigger.removeEventListener('click', onClick);

        for (const target of hoverTargets) {
          target.removeEventListener('pointerenter', onEnter);
          target.removeEventListener('pointerleave', onLeave);
        }
      });
    });
  }

  show(): void {
    if (supportsPopover() && !this.openNow()) {
      this.menu.showPopover();
    }
  }

  hide(): void {
    if (this.openNow()) {
      this.menu.hidePopover();
    }
  }

  containsFocus(): boolean {
    return this.menu.contains(this.document.activeElement);
  }

  /** Opens the menu and moves focus to its first item. */
  openAndFocusFirstItem(): void {
    if (this.openNow()) {
      this.items()[0]?.focus();

      return;
    }

    this.enterOnOpen = true;
    this.show();
  }

  protected onToggle(event: Event): void {
    const open =
      'newState' in event
        ? event.newState === 'open'
        : this.menu.matches(':popover-open');

    this.isOpen.set(open);
    this.trigger().setAttribute('aria-expanded', String(open));

    if (!open) {
      this.enterOnOpen = false;
      this.openedByHover = false;
      this.restoreFocusIfLost();

      return;
    }

    if (!supportsAnchorPositioning()) {
      this.placeWithoutAnchorPositioning();
    }

    if (this.enterOnOpen) {
      this.enterOnOpen = false;
      this.items()[0]?.focus();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      // Leave the menu: close it, and let focus move on from the trigger.
      this.trigger().focus({ preventScroll: true });
      this.hide();

      return;
    }

    if (!this.arrowKeys()) {
      return;
    }

    const items = this.items();

    const current = items.findIndex(
      (item) => item === this.document.activeElement
    );

    const last = items.length - 1;

    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
        ? last
        : event.key === 'ArrowDown'
        ? current < 0 || current === last
          ? 0
          : current + 1
        : event.key === 'ArrowUp'
        ? current <= 0
          ? last
          : current - 1
        : null;

    if (next === null || items.length === 0) {
      return;
    }

    event.preventDefault();
    items[next]?.focus({ preventScroll: true });
  }

  protected onClick(event: MouseEvent): void {
    if (!this.closeOnActivate()) {
      return;
    }

    const item =
      event.target instanceof Element
        ? event.target.closest(ITEM_SELECTOR)
        : null;

    if (!item || !this.menu.contains(item)) {
      return;
    }

    // The item's own click handler has run (it is deeper in the tree). Return
    // focus to the trigger unless the action moved it elsewhere, such as into
    // a dialog it opened.
    const fromPointer = event.detail > 0;

    queueMicrotask(() => {
      if (this.menu.contains(this.document.activeElement)) {
        this.trigger().focus({ focusVisible: !fromPointer });
      }

      this.hide();
    });
  }

  private onTriggerKeydown(event: KeyboardEvent): void {
    if (!this.arrowKeys()) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      // Keyboard opens enter the menu; the invoker toggles it natively.
      this.enterOnOpen = !this.openNow();

      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.openAndFocusFirstItem();
    }
  }

  private onTriggerClick(event: MouseEvent): void {
    const afterHoverPreview =
      this.openedByHover && event.detail > 0 && this.openNow();

    this.openedByHover = false;

    if (afterHoverPreview) {
      // Keep the previewed menu open: cancel the toggle-popover command.
      event.preventDefault();

      return;
    }

    if (
      event.defaultPrevented ||
      supportsInvokerCommands() ||
      !supportsPopover()
    ) {
      return;
    }

    // Older browsers ignore commandfor: toggle from script.
    event.preventDefault();

    if (this.openNow()) {
      this.hide();
    } else {
      this.show();
    }
  }

  private onPointerEnter(event: PointerEvent): void {
    if (!this.hoverApplies(event)) {
      return;
    }

    clearTimeout(this.hoverCloseTimer);

    if (supportsPopover() && !this.openNow()) {
      this.openedByHover = true;
      this.show();
    }
  }

  private onPointerLeave(event: PointerEvent): void {
    if (!this.hoverApplies(event)) {
      return;
    }

    clearTimeout(this.hoverCloseTimer);
    // Room to cross the gap between the trigger and the menu.
    this.hoverCloseTimer = setTimeout(() => {
      // Keep a menu the keyboard user is in.
      if (!this.containsFocus()) {
        this.hide();
      }
    }, HOVER_CLOSE_DELAY_MS);
  }

  // Only a mouse hovers. Touch and pen send enter/leave around every tap,
  // which would close the menu right after it opens.
  private hoverApplies(event: PointerEvent): boolean {
    return this.openOnHover() && event.pointerType === 'mouse';
  }

  /** Live state; `isOpen` follows the asynchronous toggle event. */
  private openNow(): boolean {
    return supportsPopover() && this.menu.matches(':popover-open');
  }

  private restoreFocusIfLost(): void {
    const active = this.document.activeElement;

    if (
      !active ||
      active === this.document.body ||
      this.menu.contains(active)
    ) {
      this.trigger().focus({ preventScroll: true, focusVisible: false });
    }
  }

  private items(): HTMLElement[] {
    return Array.from(
      this.menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR)
    ).filter(
      (item) =>
        !item.matches(':disabled') &&
        item.getAttribute('aria-disabled') !== 'true' &&
        isRendered(item)
    );
  }

  /**
   * Without CSS anchor positioning a popover is centered on screen, detached
   * from its trigger. Place it below (or, with `dropdown-top`, above) the
   * trigger, aligned to its start (or end, with `dropdown-end`), flipping and
   * clamping to stay inside the viewport.
   */
  private placeWithoutAnchorPositioning(): void {
    const view = this.document.defaultView;

    if (!view) {
      return;
    }

    const menu = this.menu;

    const trigger = this.trigger().getBoundingClientRect();
    const { width, height } = menu.getBoundingClientRect();
    const above = trigger.top - FALLBACK_GAP_PX - height;
    const below = trigger.bottom + FALLBACK_GAP_PX;
    const preferAbove = menu.classList.contains('dropdown-top');
    const fitsAbove = above >= FALLBACK_GAP_PX;
    const fitsBelow = below + height <= view.innerHeight - FALLBACK_GAP_PX;

    const top =
      (preferAbove && fitsAbove) || (!preferAbove && !fitsBelow && fitsAbove)
        ? above
        : below;

    const start = menu.classList.contains('dropdown-end')
      ? trigger.right - width
      : trigger.left;

    const left = Math.min(
      Math.max(start, FALLBACK_GAP_PX),
      Math.max(FALLBACK_GAP_PX, view.innerWidth - width - FALLBACK_GAP_PX)
    );

    menu.style.top = `${Math.max(top, FALLBACK_GAP_PX)}px`;
    menu.style.left = `${left}px`;
  }
}

function isRendered(element: HTMLElement): boolean {
  // Skips items hidden with display: none (for example by a breakpoint).
  return 'checkVisibility' in element ? element.checkVisibility() : true;
}

function supportsPopover(): boolean {
  return 'showPopover' in HTMLElement.prototype;
}

function supportsInvokerCommands(): boolean {
  return 'commandForElement' in HTMLButtonElement.prototype;
}

function supportsAnchorPositioning(): boolean {
  return 'CSS' in globalThis && CSS.supports('position-area: bottom');
}

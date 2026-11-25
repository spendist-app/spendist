/**
 * True while an Input Method Editor (IME) is composing text, for example a
 * Japanese conversion or an Android keyboard's word suggestion. Keys pressed
 * then (Enter confirming a candidate, Escape cancelling it) belong to the IME
 * and must not trigger the field's own shortcuts.
 *
 * Safari has delivered the confirming Enter keydown after `compositionend`,
 * with `isComposing` already reset; keyCode 229 (VK_PROCESSKEY) still marks it.
 */
export function isImeComposing(event: KeyboardEvent): boolean {
  // SAFETY: keyCode is deprecated but is the only signal Safari gives for an
  // IME-confirming keydown that arrives after compositionend.
  return event.isComposing || event.keyCode === 229;
}

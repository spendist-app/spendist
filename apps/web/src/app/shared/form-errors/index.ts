import { FieldErrorDirective } from './field-error.directive';
import { FocusFirstInvalidFieldDirective } from './focus-first-invalid-field.directive';

export { FieldErrorDirective } from './field-error.directive';

export { FocusFirstInvalidFieldDirective } from './focus-first-invalid-field.directive';

export { FormErrorAnnouncer } from './form-error-announcer.service';

/** Import into a standalone component whose forms show field errors. */
export const FORM_ERROR_DIRECTIVES = [
  FieldErrorDirective,
  FocusFirstInvalidFieldDirective,
] as const;

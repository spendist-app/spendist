import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { vi } from 'vitest';
import { fixtureElement, requiredValue } from '../../../testing/dom';
import { FORM_ERROR_DIRECTIVES } from './index';

@Component({
  imports: [ReactiveFormsModule, ...FORM_ERROR_DIRECTIVES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" appFocusFirstInvalid (ngSubmit)="submit()">
      <label for="name">Name <span aria-hidden="true">*</span></label>
      <input
        id="name"
        formControlName="name"
        aria-describedby="name-help"
        appFieldError="name-error"
      />
      <span id="name-help">Shown on your profile.</span>
      @if (form.controls.name.touched && form.controls.name.invalid) {
      <span id="name-error">Enter your name.</span>
      }

      <label for="email">Email</label>
      <input id="email" formControlName="email" appFieldError="email-error" />
      @if (form.controls.email.touched && form.controls.email.invalid) {
      <span id="email-error" role="alert">Enter your email.</span>
      }

      <label>
        <span>Amount</span>
        <input
          id="amount"
          formControlName="amount"
          aria-describedby="amount-help"
          appFieldError="amount-error"
        />
        <span id="amount-help">For example 12.50.</span>
        @if (form.controls.amount.touched && form.controls.amount.invalid) {
        <span id="amount-error">Enter an amount.</span>
        }
      </label>

      <button type="submit">Save</button>
    </form>
  `,
})
class FormHostComponent {
  readonly form = new FormGroup({
    name: new FormControl('', { validators: Validators.required }),
    email: new FormControl('', { validators: Validators.required }),
    amount: new FormControl('', { validators: Validators.required }),
  });

  submit(): void {
    this.form.markAllAsTouched();
  }
}

async function setUp() {
  const fixture = TestBed.createComponent(FormHostComponent);

  await fixture.whenStable();

  const root = fixtureElement(fixture);

  const field = (id: string) =>
    requiredValue(root.querySelector<HTMLInputElement>(`#${id}`));

  return {
    fixture,
    root,
    name: field('name'),
    email: field('email'),
    amount: field('amount'),
  };
}

function announcerText(): string | null {
  return (
    document.querySelector('[data-testid="form-error-announcer"]')
      ?.textContent ?? null
  );
}

describe('form error directives', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormHostComponent],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
    document
      .querySelectorAll('[data-testid="form-error-announcer"]')
      .forEach((region) => region.remove());
  });

  it('marks a field valid until its error is shown', async () => {
    const { name } = await setUp();

    expect(name.getAttribute('aria-invalid')).toBe('false');
    expect(name.getAttribute('aria-describedby')).toBe('name-help');
  });

  it('links the error while it is shown and unlinks it once fixed', async () => {
    const { fixture, name } = await setUp();

    name.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(name.getAttribute('aria-describedby')).toBe('name-help name-error');

    name.value = 'Ola';
    name.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(name.getAttribute('aria-invalid')).toBe('false');
    expect(name.getAttribute('aria-describedby')).toBe('name-help');
  });

  it('announces an error once when the user leaves the field', async () => {
    const { name } = await setUp();

    vi.useFakeTimers();
    name.dispatchEvent(new Event('blur'));
    await vi.advanceTimersByTimeAsync(500);

    expect(announcerText()).toBe('Name: Enter your name.');

    name.dispatchEvent(new Event('blur'));
    await vi.advanceTimersByTimeAsync(500);

    expect(announcerText()).toBe('');

    name.value = 'Ola';
    name.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(0);

    expect(name.getAttribute('aria-invalid')).toBe('false');
  });

  it('names a field wrapped by its label without its help and error text', async () => {
    const { amount } = await setUp();

    vi.useFakeTimers();
    amount.dispatchEvent(new Event('blur'));
    await vi.advanceTimersByTimeAsync(500);

    expect(announcerText()).toBe('Amount: Enter an amount.');
  });

  it('leaves an error that is its own live region to announce itself', async () => {
    const { email } = await setUp();

    vi.useFakeTimers();
    email.dispatchEvent(new Event('blur'));
    await vi.advanceTimersByTimeAsync(500);

    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(announcerText() ?? '').toBe('');
  });

  it('moves focus to the first invalid field after a failed submit', async () => {
    const { fixture, root, name } = await setUp();

    const submit = requiredValue(
      root.querySelector<HTMLButtonElement>('button[type="submit"]')
    );

    submit.focus();
    submit.click();
    await fixture.whenStable();

    expect(document.activeElement).toBe(name);
  });
});

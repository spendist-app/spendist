import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@ngneat/transloco';

// Shown before an email link replaces the account that is already signed in.
@Component({
  standalone: true,
  selector: 'app-account-switch-prompt',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div
    class="space-y-4 text-left"
    role="alertdialog"
    aria-labelledby="account-switch-title"
  >
    <div class="alert alert-warning">
      <div>
        <h2 id="account-switch-title" class="font-semibold">
          {{ 'auth.switchAccount.title' | transloco }}
        </h2>
        <p class="mt-1 text-sm">
          {{
            'auth.switchAccount.description' | transloco : { email: email() }
          }}
        </p>
      </div>
    </div>
    <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
      <button type="button" class="btn btn-ghost" (click)="cancelled.emit()">
        {{ 'auth.switchAccount.cancel' | transloco }}
      </button>
      <button type="button" class="btn btn-primary" (click)="confirmed.emit()">
        {{ 'auth.switchAccount.continue' | transloco }}
      </button>
    </div>
  </div>`,
})
export class AccountSwitchPrompt {
  readonly email = input.required<string>();
  readonly confirmed = output();
  readonly cancelled = output();
}

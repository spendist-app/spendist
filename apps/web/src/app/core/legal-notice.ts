import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { LanguageService } from './language.service';
import { LEGAL_VERSION } from '../pages/legal/legal-content.generated';

const currentAcceptance = z.object({
  terms_version: z.literal(LEGAL_VERSION),
  privacy_version: z.literal(LEGAL_VERSION),
  adult_confirmed: z.literal(true),
  accepted_at: z.string().datetime(),
});

@Component({
  selector: 'app-legal-notice',
  imports: [ReactiveFormsModule, RouterLink, TranslocoPipe],
  templateUrl: './legal-notice.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalNotice {
  private readonly auth = inject(AuthService);
  private readonly builder = inject(NonNullableFormBuilder);
  readonly legalLanguage = inject(LanguageService).currentLanguage;
  readonly pending = signal(false);
  readonly failed = signal(false);
  private readonly userId = computed(
    () => this.auth.session()?.user.id ?? null
  );
  readonly visible = computed(() => {
    const session = this.auth.session();

    return (
      !!session &&
      !currentAcceptance.safeParse(
        session.user.user_metadata['legal_acceptance']
      ).success
    );
  });
  readonly form = this.builder.group({
    adultConfirmed: [false, Validators.requiredTrue],
    termsAccepted: [false, Validators.requiredTrue],
  });

  constructor() {
    effect(() => {
      this.userId();
      this.form.reset();
      this.failed.set(false);
    });
  }

  async confirm(): Promise<void> {
    if (this.pending()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    this.pending.set(true);
    this.failed.set(false);

    try {
      const result = await this.auth.acceptLegalTerms();
      this.failed.set(!!result.error);
    } finally {
      this.pending.set(false);
    }
  }
}

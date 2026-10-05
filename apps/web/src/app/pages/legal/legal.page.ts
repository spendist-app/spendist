import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
  computed,
  effect,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { LanguageService } from '../../core/language.service';
import {
  LEGAL_DOCUMENTS,
  LEGAL_DOCUMENTS_EN,
  type LegalDocument,
} from './legal-content.generated';

const SITE_URL = 'https://spendist.app';

@Component({
  selector: 'app-legal-page',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './legal.page.html',
  styleUrl: './legal.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class LegalPage {
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly documentNode = inject(DOCUMENT);
  private readonly language = inject(LanguageService);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly locale = computed(() =>
    this.queryParams().get('lang') === 'en' ? 'en' : 'pl'
  );
  protected readonly legalDocument = computed(() => this.resolveDocument());
  protected readonly alternateDocument = computed(() => {
    const documents =
      this.locale() === 'en' ? LEGAL_DOCUMENTS_EN : LEGAL_DOCUMENTS;

    return this.legalDocument().key === 'privacy'
      ? documents.terms
      : documents.privacy;
  });

  constructor() {
    effect(() => {
      this.language.setLanguage(this.locale());
      this.applySeo(this.legalDocument());
    });
  }

  private resolveDocument(): LegalDocument {
    const key: unknown = this.route.snapshot.data['legalDocument'];

    if (key !== 'privacy' && key !== 'terms') {
      throw new Error('Missing legalDocument route data.');
    }

    return (this.locale() === 'en' ? LEGAL_DOCUMENTS_EN : LEGAL_DOCUMENTS)[key];
  }

  private applySeo(document: LegalDocument): void {
    const canonical = `${SITE_URL}${document.path}`;
    this.documentNode.documentElement.lang = this.locale();
    this.title.setTitle(`${document.title} | Spendist`);
    this.meta.updateTag({ name: 'description', content: document.description });
    this.meta.updateTag({ name: 'robots', content: 'index,follow' });
    this.meta.updateTag({ property: 'og:title', content: document.title });
    this.meta.updateTag({
      property: 'og:description',
      content: document.description,
    });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.documentNode.head.querySelector('link[rel="canonical"]')?.remove();
    const link = this.documentNode.createElement('link');
    link.rel = 'canonical';
    link.href = canonical;
    this.documentNode.head.appendChild(link);
  }
}

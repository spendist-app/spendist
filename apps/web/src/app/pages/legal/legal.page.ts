import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { LanguageService } from '../../core/language.service';
import { LEGAL_DOCUMENTS, type LegalDocument } from './legal-content.generated';

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
  protected readonly legalDocument = this.resolveDocument();
  protected readonly alternateDocument =
    this.legalDocument.key === 'privacy'
      ? LEGAL_DOCUMENTS.terms
      : LEGAL_DOCUMENTS.privacy;

  constructor() {
    this.language.setLanguage('pl');
    this.applySeo(this.legalDocument);
  }

  private resolveDocument(): LegalDocument {
    const key: unknown = this.route.snapshot.data['legalDocument'];
    if (key !== 'privacy' && key !== 'terms') {
      throw new Error('Missing legalDocument route data.');
    }
    return LEGAL_DOCUMENTS[key];
  }

  private applySeo(document: LegalDocument): void {
    const canonical = `${SITE_URL}${document.path}`;
    this.documentNode.documentElement.lang = 'pl';
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

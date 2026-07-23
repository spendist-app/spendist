import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { LanguageService } from '../../core/language.service';
import { blogPath } from './blog-content';
import { BlogSeoService } from './blog-seo.service';
import type { BlogLocale } from './blog.types';

@Component({
  selector: 'app-blog-not-found',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './blog-not-found.html',
  styleUrl: './blog-not-found.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogNotFound {
  private readonly route = inject(ActivatedRoute);
  private readonly language = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);
  private readonly seo = inject(BlogSeoService);
  protected readonly locale = this.route.snapshot.data[
    'blogLocale'
  ] as BlogLocale;
  protected readonly basePath = blogPath(this.locale);

  constructor() {
    this.language.setLanguage(this.locale);
    this.seo.apply({
      title: this.transloco.translate('blog.notFound.seoTitle'),
      description: this.transloco.translate('blog.notFound.description'),
      path: this.basePath,
      locale: this.locale,
      robots: 'noindex,follow',
    });
  }
}

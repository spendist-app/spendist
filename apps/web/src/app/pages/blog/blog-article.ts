import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { LanguageService } from '../../core/language.service';
import { blogPath, findBlogArticle, findBlogCategory } from './blog-content';
import { BlogSeoService } from './blog-seo.service';
import { BlogShare } from './blog-share';
import type { BlogLocale } from './blog.types';
import { ResponsiveImage } from '../../shared/responsive-image/responsive-image';

@Component({
  selector: 'app-blog-article',
  imports: [RouterLink, TranslocoPipe, ResponsiveImage, BlogShare],
  templateUrl: './blog-article.html',
  styleUrl: './blog-article.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class BlogArticle {
  private readonly route = inject(ActivatedRoute);
  private readonly language = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);
  private readonly seo = inject(BlogSeoService);
  protected readonly locale = this.route.snapshot.data[
    'blogLocale'
  ] as BlogLocale;
  protected readonly basePath = blogPath(this.locale);
  protected readonly article = findBlogArticle(
    this.locale,
    this.route.snapshot.paramMap.get('slug') ?? ''
  );
  protected readonly category = this.article
    ? findBlogCategory(this.locale, this.article.category)
    : undefined;
  protected readonly absoluteUrl = this.article
    ? `https://spendist.app${this.article.url}`
    : `https://spendist.app${this.basePath}`;

  constructor() {
    this.language.setLanguage(this.locale);
    this.applySeo();
  }

  private applySeo(): void {
    if (!this.article) {
      this.seo.apply({
        title: this.transloco.translate('blog.notFound.seoTitle'),
        description: this.transloco.translate('blog.notFound.description'),
        path: this.basePath,
        locale: this.locale,
        robots: 'noindex,follow',
      });
      return;
    }
    const article = this.article;
    const published = `${article.publishedAt}T00:00:00Z`;
    const modified = article.updatedAt
      ? `${article.updatedAt}T00:00:00Z`
      : null;
    const categoryName = this.category?.name ?? article.category;
    this.seo.apply({
      title: `${article.title} | Spendist`,
      description: article.description,
      path: article.url,
      locale: article.locale,
      type: 'article',
      image: article.coverImage.fallback.src,
      imageAlt: article.coverImageAlt,
      publishedAt: published,
      updatedAt: modified,
      category: categoryName,
      tags: article.tags,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: article.title,
          description: article.description,
          image: `https://spendist.app${article.coverImage.fallback.src}`,
          datePublished: published,
          dateModified: modified ?? published,
          inLanguage: article.locale,
          mainEntityOfPage: this.absoluteUrl,
          author: {
            '@type': 'Organization',
            name: 'Spendist Team',
            url: 'https://spendist.app/',
          },
          publisher: {
            '@type': 'Organization',
            name: 'Spendist',
            url: 'https://spendist.app/',
          },
          articleSection: categoryName,
          keywords: article.tags.join(', '),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Spendist',
              item: 'https://spendist.app/',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: this.transloco.translate('blog.common.badge'),
              item: `https://spendist.app${this.basePath}`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: article.title,
              item: this.absoluteUrl,
            },
          ],
        },
      ],
    });
  }
}

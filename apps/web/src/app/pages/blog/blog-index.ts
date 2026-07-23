import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { LanguageService } from '../../core/language.service';
import {
  BLOG_PAGE_SIZE,
  blogArticles,
  blogCategories,
  blogPath,
  findBlogCategory,
} from './blog-content';
import { BlogSeoService } from './blog-seo.service';
import type { BlogLocale } from './blog.types';
import { ResponsiveImage } from '../../shared/responsive-image/responsive-image';

@Component({
  selector: 'app-blog-index',
  imports: [RouterLink, RouterLinkActive, TranslocoPipe, ResponsiveImage],
  templateUrl: './blog-index.html',
  styleUrl: './blog-index.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogIndex {
  private readonly route = inject(ActivatedRoute);
  private readonly language = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);
  private readonly seo = inject(BlogSeoService);
  protected readonly locale = this.route.snapshot.data[
    'blogLocale'
  ] as BlogLocale;
  protected readonly basePath = blogPath(this.locale);
  protected readonly categorySlug =
    this.route.snapshot.paramMap.get('categorySlug');
  protected readonly category = this.categorySlug
    ? findBlogCategory(this.locale, this.categorySlug)
    : undefined;
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly activeTag = computed(
    () => this.queryParams().get('tag')?.trim() ?? ''
  );
  protected readonly categories = blogCategories(this.locale).filter(
    (candidate) =>
      blogArticles(this.locale).some(
        (article) => article.category === candidate.slug
      )
  );
  protected readonly filteredArticles = computed(() => {
    const tag = this.activeTag();
    return blogArticles(this.locale).filter(
      (article) =>
        (!this.categorySlug || article.category === this.categorySlug) &&
        (!tag || article.tags.includes(tag))
    );
  });
  protected readonly page = Math.max(
    1,
    Number(this.route.snapshot.paramMap.get('page') ?? 1)
  );
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filteredArticles().length / BLOG_PAGE_SIZE))
  );
  protected readonly articles = computed(() =>
    this.filteredArticles().slice(
      (this.page - 1) * BLOG_PAGE_SIZE,
      this.page * BLOG_PAGE_SIZE
    )
  );
  protected readonly invalid = computed(
    () =>
      (!!this.categorySlug && !this.category) ||
      !Number.isInteger(this.page) ||
      this.page > this.pageCount()
  );
  protected readonly titleKey = this.category
    ? 'blog.category.title'
    : 'blog.index.title';

  constructor() {
    this.language.setLanguage(this.locale);
    effect(() => this.applySeo(this.activeTag()));
  }

  protected categoryName(slug: string): string {
    return (
      this.categories.find((category) => category.slug === slug)?.name ?? slug
    );
  }

  protected pagePath(page: number): string {
    const categoryPrefix = this.category
      ? `${this.basePath}/category/${this.category.slug}`
      : this.basePath;
    return page === 1 ? categoryPrefix : `${categoryPrefix}/page/${page}`;
  }

  private applySeo(tag: string): void {
    const title = this.category
      ? this.transloco.translate('blog.category.seoTitle', {
          category: this.category.name,
        })
      : this.transloco.translate('blog.index.seoTitle');
    const description =
      this.category?.description ??
      String(this.transloco.translate('blog.index.description'));
    const path = this.pagePath(this.page);
    const robots =
      tag || this.invalid()
        ? 'noindex,follow'
        : 'index,follow,max-image-preview:large';
    this.seo.apply({
      title,
      description,
      path,
      locale: this.locale,
      robots,
      alternates: this.category
        ? []
        : [
            { locale: 'pl', path: '/pl/blog' },
            { locale: 'en', path: '/en/blog' },
          ],
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': this.category ? 'CollectionPage' : 'Blog',
          name: title,
          description,
          url: `https://spendist.app${path}`,
          inLanguage: this.locale,
          publisher: {
            '@type': 'Organization',
            name: 'Spendist',
            url: 'https://spendist.app/',
          },
        },
      ],
    });
  }
}

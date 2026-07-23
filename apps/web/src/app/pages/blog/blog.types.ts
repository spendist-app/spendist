import type { WebImage } from '../../shared/responsive-image/responsive-image.types';

export type BlogLocale = 'pl' | 'en';

export interface BlogHeading {
  readonly depth: 2 | 3;
  readonly id: string;
  readonly text: string;
}

export interface BlogArticleModel {
  readonly locale: BlogLocale;
  readonly title: string;
  readonly slug: string;
  readonly description: string;
  readonly publishedAt: string;
  readonly updatedAt: string | null;
  readonly category: string;
  readonly tags: readonly string[];
  readonly coverImage: WebImage;
  readonly coverImageAlt: string;
  readonly bodyHtml: string;
  readonly headings: readonly BlogHeading[];
  readonly readingMinutes: number;
  readonly url: string;
}

export interface BlogCategoryModel {
  readonly locale: BlogLocale;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
}

export interface BlogGeneratedContent {
  readonly articles: readonly BlogArticleModel[];
  readonly categories: readonly BlogCategoryModel[];
}

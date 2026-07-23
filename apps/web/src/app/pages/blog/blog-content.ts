import { BLOG_CONTENT } from './blog-content.generated';
import type {
  BlogArticleModel,
  BlogCategoryModel,
  BlogLocale,
} from './blog.types';

export const BLOG_PAGE_SIZE = 12;
export const BLOG_LOCALES: readonly BlogLocale[] = ['pl', 'en'];

export function isBlogLocale(
  value: string | null | undefined
): value is BlogLocale {
  return value === 'pl' || value === 'en';
}

export function blogArticles(locale: BlogLocale): readonly BlogArticleModel[] {
  return BLOG_CONTENT.articles.filter((article) => article.locale === locale);
}

export function blogCategories(
  locale: BlogLocale
): readonly BlogCategoryModel[] {
  return BLOG_CONTENT.categories.filter(
    (category) => category.locale === locale
  );
}

export function findBlogArticle(
  locale: BlogLocale,
  slug: string
): BlogArticleModel | undefined {
  return BLOG_CONTENT.articles.find(
    (article) => article.locale === locale && article.slug === slug
  );
}

export function findBlogCategory(
  locale: BlogLocale,
  slug: string
): BlogCategoryModel | undefined {
  return BLOG_CONTENT.categories.find(
    (category) => category.locale === locale && category.slug === slug
  );
}

export function blogPath(locale: BlogLocale): string {
  return `/${locale}/blog`;
}

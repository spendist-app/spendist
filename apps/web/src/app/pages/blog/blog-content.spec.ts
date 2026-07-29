import {
  BLOG_PAGE_SIZE,
  blogArticles,
  blogCategories,
  blogPath,
  findBlogArticle,
  findBlogCategory,
} from './blog-content';

describe('blog content', () => {
  it('keeps Polish and English repositories independent', () => {
    expect(blogPath('pl')).toBe('/pl/blog');
    expect(blogPath('en')).toBe('/en/blog');
    expect(blogArticles('pl').map(({ slug }) => slug)).toEqual([
      'czym-jest-spendist',
      'dlaczego-powstal-spendist',
      'platnosci-cykliczne-w-domowym-budzecie',
    ]);
    expect(blogArticles('en').map(({ slug }) => slug)).toEqual([
      'recurring-payments-household-budget',
      'what-is-spendist',
      'why-was-spendist-created',
    ]);
    expect(findBlogArticle('pl', 'what-is-spendist')).toBeUndefined();
    expect(findBlogArticle('en', 'czym-jest-spendist')).toBeUndefined();
    expect(blogCategories('pl').map(({ slug }) => slug)).toEqual([
      'spendist',
      'budzet-domowy',
    ]);
    expect(blogCategories('en').map(({ slug }) => slug)).toEqual([
      'spendist',
      'household-budget',
    ]);
    expect(findBlogArticle('en', 'missing')).toBeUndefined();
    expect(findBlogCategory('pl', 'missing')).toBeUndefined();
    expect(BLOG_PAGE_SIZE).toBe(12);
  });
});

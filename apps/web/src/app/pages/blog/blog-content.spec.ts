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
    expect(blogArticles('pl')).toEqual([]);
    expect(blogArticles('en')).toEqual([]);
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

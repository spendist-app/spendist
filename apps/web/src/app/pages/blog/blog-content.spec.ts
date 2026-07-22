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
    expect(blogCategories('pl')).toEqual([]);
    expect(blogCategories('en')).toEqual([]);
    expect(findBlogArticle('en', 'missing')).toBeUndefined();
    expect(findBlogCategory('pl', 'missing')).toBeUndefined();
    expect(BLOG_PAGE_SIZE).toBe(12);
  });
});

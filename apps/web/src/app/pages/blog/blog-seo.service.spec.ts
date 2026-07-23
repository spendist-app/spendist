import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BlogSeoService } from './blog-seo.service';

describe('BlogSeoService', () => {
  it('writes canonical, hreflang, social and structured metadata', () => {
    const service = TestBed.inject(BlogSeoService);
    const document = TestBed.inject(DOCUMENT);

    service.apply({
      title: 'Spendist Blog',
      description: 'Independent English content about personal finance.',
      path: '/en/blog',
      locale: 'en',
      alternates: [
        { locale: 'pl', path: '/pl/blog' },
        { locale: 'en', path: '/en/blog' },
      ],
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'Blog' }],
    });

    expect(
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href
    ).toBe('https://spendist.app/en/blog');
    expect(document.querySelectorAll('link[hreflang]')).toHaveLength(2);
    expect(
      document
        .querySelector('meta[property="og:type"]')
        ?.getAttribute('content')
    ).toBe('website');
    expect(
      document.querySelector('script[data-blog-json-ld="true"]')?.textContent
    ).toContain('"@type":"Blog"');
  });
});

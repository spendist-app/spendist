import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { LanguageService } from '../../core/language.service';
import { provideAppTransloco } from '../../i18n/transloco.providers';
import { BlogArticle } from './blog-article';
import { BlogSeoService } from './blog-seo.service';

describe('BlogArticle', () => {
  const seo = { apply: vi.fn() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlogArticle],
      providers: [
        provideRouter([]),
        ...provideAppTransloco(),
        { provide: BlogSeoService, useValue: seo },
        { provide: LanguageService, useValue: { setLanguage: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { blogLocale: 'pl' },
              paramMap: convertToParamMap({ slug: 'missing-article' }),
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('marks an unknown article as noindex and shows the localized fallback', async () => {
    const fixture = TestBed.createComponent(BlogArticle);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(seo.apply).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/pl/blog', robots: 'noindex,follow' })
    );
    expect(fixture.nativeElement.querySelector('.not-found h1')).toBeTruthy();
  });
});

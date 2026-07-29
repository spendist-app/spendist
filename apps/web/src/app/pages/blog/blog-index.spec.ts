import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of } from 'rxjs';
import { LanguageService } from '../../core/language.service';
import { provideAppTransloco } from '../../i18n/transloco.providers';
import { BlogIndex } from './blog-index';
import { BlogSeoService } from './blog-seo.service';

describe('BlogIndex', () => {
  const seo = { apply: vi.fn() };
  const language = { setLanguage: vi.fn() };

  beforeEach(async () => {
    const queryParamMap = convertToParamMap({});
    await TestBed.configureTestingModule({
      imports: [BlogIndex],
      providers: [
        provideRouter([]),
        ...provideAppTransloco(),
        { provide: BlogSeoService, useValue: seo },
        { provide: LanguageService, useValue: language },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { blogLocale: 'en' },
              paramMap: convertToParamMap({}),
              queryParamMap,
            },
            queryParamMap: of(queryParamMap),
          },
        },
      ],
    }).compileComponents();
  });

  it('renders the published English articles on an indexable blog', async () => {
    const fixture = TestBed.createComponent(BlogIndex);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(language.setLanguage).toHaveBeenCalledWith('en');
    expect(seo.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/en/blog',
        locale: 'en',
        robots: 'index,follow,max-image-preview:large',
      })
    );
    const cards = fixture.nativeElement.querySelectorAll(
      '.article-card'
    ) as NodeListOf<HTMLElement>;
    expect(cards).toHaveLength(3);
    expect(cards[0]?.textContent).toContain('Recurring Payments');
    expect(
      fixture.nativeElement.querySelector('.empty-state h2')
    ).not.toBeTruthy();
  });
});

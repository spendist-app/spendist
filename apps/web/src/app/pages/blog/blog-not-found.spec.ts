import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { LanguageService } from '../../core/language.service';
import { provideAppTransloco } from '../../i18n/transloco.providers';
import { BlogNotFound } from './blog-not-found';
import { BlogSeoService } from './blog-seo.service';

describe('BlogNotFound', () => {
  it('uses a noindex response page for an unknown blog URL', async () => {
    const seo = { apply: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [BlogNotFound],
      providers: [
        provideRouter([]),
        ...provideAppTransloco(),
        { provide: BlogSeoService, useValue: seo },
        { provide: LanguageService, useValue: { setLanguage: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { blogLocale: 'en' } } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(BlogNotFound);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(seo.apply).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/en/blog', robots: 'noindex,follow' })
    );
  });
});

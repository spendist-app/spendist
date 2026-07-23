import { TestBed } from '@angular/core/testing';
import { provideAppTransloco } from '../../i18n/transloco.providers';
import { BlogShare } from './blog-share';

describe('BlogShare', () => {
  it('builds privacy-friendly social share links without SDKs', async () => {
    await TestBed.configureTestingModule({
      imports: [BlogShare],
      providers: [...provideAppTransloco()],
    }).compileComponents();

    const fixture = TestBed.createComponent(BlogShare);
    fixture.componentRef.setInput('title', 'A useful article');
    fixture.componentRef.setInput(
      'url',
      'https://spendist.app/en/blog/useful-article'
    );
    fixture.componentRef.setInput('locale', 'en');
    fixture.detectChanges();
    await fixture.whenStable();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLAnchorElement>(
        'a[target="_blank"]'
      )
    );
    expect(links).toHaveLength(3);
    expect(links.every((link) => link.rel.includes('noopener'))).toBe(true);
    expect(links[0].href).toContain(
      encodeURIComponent('https://spendist.app/en/blog/useful-article')
    );
  });
});

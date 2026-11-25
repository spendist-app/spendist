import { fixtureElement } from '../../../testing/dom';
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
      fixtureElement(fixture).querySelectorAll<HTMLAnchorElement>(
        'a[target="_blank"]'
      )
    );

    expect(links).toHaveLength(3);
    expect(links.every((link) => link.rel.includes('noopener'))).toBe(true);
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Facebook',
      'LinkedIn',
      'X',
    ]);
    expect(
      fixtureElement(fixture).querySelectorAll('.share-action ng-icon')
    ).toHaveLength(4);
    expect(
      fixtureElement(fixture).querySelectorAll('.share-title')
    ).toHaveLength(1);
    expect(
      Array.from(
        fixtureElement(fixture).querySelectorAll<HTMLElement>('.share-action')
      ).every((action) => action.textContent?.trim() === '')
    ).toBe(true);
    expect(links[0].href).toContain(
      encodeURIComponent('https://spendist.app/en/blog/useful-article')
    );
  });

  it('announces a failed copy instead of a false success', async () => {
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      'clipboard'
    );

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });

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
    await fixture.componentInstance['copy']();

    expect(fixture.componentInstance['copyStatus']()).toBe('failed');
    expect(fixture.componentInstance['copyLabelKey']()).toBe(
      'blog.share.copyFailed'
    );

    if (clipboardDescriptor) {
      Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
  });
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { LandingPageComponent } from './landing.page';

describe('landing canonical URL', () => {
  it('replaces previous page metadata and removes its own metadata on exit', () => {
    const previousCanonical = document.createElement('link');

    previousCanonical.rel = 'canonical';
    previousCanonical.href = 'https://spendist.app/pl/blog';
    document.head.appendChild(previousCanonical);

    TestBed.configureTestingModule({
      imports: [LandingPageComponent],
      providers: [
        { provide: AuthService, useValue: {} },
        {
          provide: LanguageService,
          useValue: { currentLanguage: signal('pl') },
        },
      ],
    }).overrideComponent(LandingPageComponent, {
      set: { template: '', imports: [] },
    });

    const fixture = TestBed.createComponent(LandingPageComponent);

    expect(
      document.head.querySelectorAll('link[rel="canonical"]')
    ).toHaveLength(1);
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')
    ).toBe('https://spendist.app/');
    expect(
      document.head
        .querySelector('meta[property="og:url"]')
        ?.getAttribute('content')
    ).toBe('https://spendist.app/');

    fixture.destroy();

    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[property="og:url"]')).toBeNull();
  });
});

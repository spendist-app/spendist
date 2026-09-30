import { fixtureElement } from '../../../testing/dom';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { provideAppTransloco } from '../../i18n/transloco.providers';
import { LegalPage } from './legal.page';

describe('LegalPage', () => {
  it.each(['privacy', 'terms'])(
    'renders %s in both languages without draft placeholders',
    async (key) => {
      const queryParamMap = new BehaviorSubject(convertToParamMap({}));
      await TestBed.configureTestingModule({
        imports: [LegalPage],
        providers: [
          provideRouter([]),
          ...provideAppTransloco(),
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                data: { legalDocument: key },
                queryParamMap: queryParamMap.value,
              },
              queryParamMap,
            },
          },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(LegalPage);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const content = fixtureElement(fixture);
      expect(content.textContent).toContain('Bartłomiej Borzucki');
      expect(content.textContent).toContain('hello@spendist.app');
      expect(content.textContent).toContain('Wersja 1.0');
      expect(content.textContent).not.toContain('Wersja robocza');
      expect(content.textContent).not.toContain('[data publikacji]');
      expect(document.documentElement.lang).toBe('pl');

      queryParamMap.next(convertToParamMap({ lang: 'en' }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(content.querySelector('h1')?.textContent).toContain(
        key === 'privacy'
          ? 'Spendist privacy policy'
          : 'Spendist terms of service'
      );
      expect(content.textContent).toContain('Version 1.0');
      expect(document.documentElement.lang).toBe('en');
      expect(
        content.querySelector('header nav a')?.getAttribute('href')
      ).toContain('lang=en');
    }
  );
});

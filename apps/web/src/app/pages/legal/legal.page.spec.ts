import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideAppTransloco } from '../../i18n/transloco.providers';
import { LegalPage } from './legal.page';

describe('LegalPage', () => {
  it('renders the generated privacy policy and contact address', async () => {
    await TestBed.configureTestingModule({
      imports: [LegalPage],
      providers: [
        provideRouter([]),
        ...provideAppTransloco(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { legalDocument: 'privacy' } } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LegalPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const content = fixture.nativeElement as HTMLElement;
    expect(content.querySelector('h1')?.textContent).toContain(
      'Polityka prywatności aplikacji Spendist'
    );
    expect(content.textContent).toContain('Bartłomiej Borzucki');
    expect(content.textContent).toContain('hello@spendist.app');
    expect(document.documentElement.lang).toBe('pl');
    expect(document.title).toContain('Polityka prywatności aplikacji Spendist');
  });
});

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AnalyticsConsent } from './analytics-consent';
import { PublicAnalyticsService } from './public-analytics.service';
import { provideAppTransloco } from '../i18n/transloco.providers';
import { fixtureElement } from '../../testing/dom';

class AnalyticsStub {
  readonly visible = signal(true);
  readonly choose = vi.fn();
  readonly openPreferences = vi.fn();
}

describe('AnalyticsConsent', () => {
  it('offers equal accept/refuse buttons and an accessible preferences entry', () => {
    TestBed.configureTestingModule({
      imports: [AnalyticsConsent],
      providers: [
        AnalyticsStub,
        { provide: PublicAnalyticsService, useExisting: AnalyticsStub },
        provideRouter([]),
        ...provideAppTransloco(),
      ],
    });
    const fixture = TestBed.createComponent(AnalyticsConsent);
    fixture.detectChanges();

    const element = fixtureElement(fixture);

    const buttons = element.querySelectorAll<HTMLButtonElement>(
      '[role="dialog"] button'
    );

    expect(buttons.length).toBe(2);
    expect(buttons[0].className).toBe(buttons[1].className);

    buttons[0].click();
    buttons[1].click();
    expect(TestBed.inject(AnalyticsStub).choose.mock.calls).toEqual([
      ['rejected'],
      ['accepted'],
    ]);

    element.querySelector<HTMLButtonElement>('footer button')?.click();
    expect(
      TestBed.inject(AnalyticsStub).openPreferences
    ).toHaveBeenCalledOnce();
  });
});

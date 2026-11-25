import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@ngneat/transloco';
import { firstValueFrom } from 'rxjs';
import type { PlaceRow } from '@spendist/data-access/supabase-types';
import { AuthService } from '../../../core/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase';
import { provideAppTransloco } from '../../../i18n/transloco.providers';
import { PlacesPageComponent } from './places.page';

const OWNER_ID = '40000000-0000-0000-0000-000000000001';

function placeRow(
  id: string,
  name: string,
  city: string | null = null
): PlaceRow {
  return {
    id,
    owner_id: OWNER_ID,
    name,
    street: null,
    city,
    postal_code: null,
    country: null,
    note: null,
    logo: null,
    creation_date: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-20T10:00:00Z',
  };
}

const targ = placeRow('place-1', 'Targ Piast');

const targDuplicate = placeRow('place-2', 'targ  piast', 'Gliwice');

const pepco = placeRow('place-3', 'Pepco');

class AuthServiceStub {
  readonly loading = signal(false);
  readonly session = signal({ user: { id: OWNER_ID } });
}

/** Minimal Supabase client covering the calls the places page makes. */
function createSupabaseFake(loads: PlaceRow[][]) {
  let current = loads[0] ?? [];

  const insert = vi.fn();

  const rpc = vi.fn(async (name: string) => {
    if (name === 'place_merge_preview') {
      return {
        data: {
          targetPlaceId: targ.id,
          sourcePlaceIds: [targDuplicate.id],
          places: [
            {
              id: targ.id,
              name: targ.name,
              city: null,
              isTarget: true,
              transactionCount: 2,
            },
            {
              id: targDuplicate.id,
              name: targDuplicate.name,
              city: 'Gliwice',
              isTarget: false,
              transactionCount: 3,
            },
          ],
          movedTransactions: 3,
          filledFields: ['city'],
        },
        error: null,
      };
    }

    return {
      data: { mergedPlaceIds: [targDuplicate.id], movedTransactions: 3 },
      error: null,
    };
  });

  const from = vi.fn(() => ({
    insert,
    select: () => ({
      eq: () => ({
        order: async () => {
          current = loads.shift() ?? current;

          return { data: current, error: null };
        },
      }),
    }),
  }));

  return { from, rpc, insert };
}

async function renderPage(loads: PlaceRow[][]) {
  const supabase = createSupabaseFake(loads);

  await TestBed.configureTestingModule({
    imports: [PlacesPageComponent],
    providers: [
      provideAppTransloco(),
      AuthServiceStub,
      { provide: AuthService, useExisting: AuthServiceStub },
      { provide: SUPABASE_CLIENT, useValue: supabase },
    ],
  }).compileComponents();

  await firstValueFrom(TestBed.inject(TranslocoService).load('en'));

  const fixture = TestBed.createComponent(PlacesPageComponent);
  await fixture.whenStable();

  const element: HTMLElement = fixture.nativeElement;

  return { fixture, element, supabase };
}

function buttonWithText(root: HTMLElement, text: string): HTMLButtonElement {
  const button = [...root.querySelectorAll('button')].find((candidate) =>
    candidate.textContent?.includes(text)
  );

  if (!button) throw new Error(`Button "${text}" was not rendered.`);

  return button;
}

describe('PlacesPageComponent', () => {
  it('suggests merging places whose names differ only by case and spacing', async () => {
    const { element } = await renderPage([[targ, targDuplicate, pepco]]);

    const suggestions = element.querySelector(
      '[aria-labelledby="places-duplicates-title"]'
    );

    expect(suggestions?.textContent).toContain('Targ Piast');

    expect(suggestions?.textContent).toContain('targ  piast');

    expect(suggestions?.textContent).not.toContain('Pepco');
  });

  it('previews and merges duplicate places', async () => {
    const { fixture, element, supabase } = await renderPage([
      [targ, targDuplicate, pepco],
      [{ ...targ, city: 'Gliwice' }, pepco],
    ]);

    buttonWithText(element, 'Review merge').click();
    await fixture.whenStable();

    const keepTarg = element.querySelector<HTMLInputElement>(
      `dialog input[type="radio"][value="${targ.id}"]`
    );

    keepTarg?.click();
    await fixture.whenStable();

    expect(supabase.rpc).toHaveBeenCalledWith('place_merge_preview', {
      p_target_id: targ.id,
      p_source_ids: [targDuplicate.id],
    });

    const dialog = element.querySelector('dialog');

    expect(dialog?.textContent).toContain(
      'Transactions moved to “Targ Piast”: 3'
    );

    expect(dialog?.textContent).toContain('Transactions: 3');

    expect(dialog?.textContent).toContain(
      'Empty fields filled from the merged places: City.'
    );

    buttonWithText(dialog ?? element, 'Merge places').click();
    await fixture.whenStable();

    expect(supabase.rpc).toHaveBeenCalledWith('merge_places', {
      p_target_id: targ.id,
      p_source_ids: [targDuplicate.id],
    });

    dialog?.dispatchEvent(new Event('close'));
    await fixture.whenStable();

    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Places merged. Transactions moved: 3.'
    );

    expect(
      element.querySelector('[aria-labelledby="places-duplicates-title"]')
    ).toBeNull();
  });

  it('refuses to add a place that already exists under another spelling', async () => {
    const { fixture, element, supabase } = await renderPage([[targ, pepco]]);

    buttonWithText(element, 'Add place').click();
    await fixture.whenStable();

    const name = element.querySelector<HTMLInputElement>(
      'input[formcontrolname="name"]'
    );

    if (!name) throw new Error('Name field was not rendered.');

    name.value = '  PEPCO ';
    name.dispatchEvent(new Event('input'));
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(supabase.insert).not.toHaveBeenCalled();

    expect(element.querySelector('#place-name-error')?.textContent).toContain(
      'A place named “Pepco” already exists.'
    );

    expect(name.getAttribute('aria-invalid')).toBe('true');
  });
});

import { describe, expect, it } from 'vitest';
import {
  duplicatePlaceGroups,
  findPlaceByName,
  placeNameKey,
} from './place-name';

describe('placeNameKey', () => {
  it('ignores case, surrounding and repeated whitespace', () => {
    expect(placeNameKey('  Targ \t  Piast ')).toBe('targ piast');

    expect(placeNameKey('PEPCO')).toBe(placeNameKey('pepco'));
  });

  it('removes Polish and other common diacritics', () => {
    expect(placeNameKey('Łódź Żabka Śródmieście')).toBe(
      'lodz zabka srodmiescie'
    );

    expect(placeNameKey('Crème Brûlée Øresund')).toBe('creme brulee oresund');
  });
});

describe('duplicate places', () => {
  const places = [
    { id: '1', name: 'Targ Piast' },
    { id: '2', name: 'targ  piast' },
    { id: '3', name: 'Pepco' },
    { id: '4', name: 'Żabka' },
    { id: '5', name: 'zabka ' },
  ];

  it('groups places with the same key', () => {
    expect(
      duplicatePlaceGroups(places).map((group) => group.map(({ id }) => id))
    ).toEqual([
      ['1', '2'],
      ['4', '5'],
    ]);
  });

  it('finds an existing place by name, optionally ignoring one place', () => {
    expect(findPlaceByName(places, ' PEPCO')?.id).toBe('3');

    expect(findPlaceByName(places, 'Targ Piast', '1')?.id).toBe('2');

    expect(findPlaceByName(places, 'Biedronka')).toBeUndefined();
  });
});

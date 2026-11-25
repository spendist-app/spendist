// Mirrors `public.place_name_key` in
// supabase/migrations/202611251530_add_place_merging.sql. Keep both lists in
// the same order: each accented letter maps to the plain letter at its index.
const ACCENTED = 'ąćęłńóśźżáàâäãåčçďéèêëěíìîïľĺňñôöõőøŕřšťúùûüůűýÿž';

const PLAIN = 'acelnoszzaaaaaaccdeeeeeiiiillnnooooorrstuuuuuuyyz';

const PLAIN_BY_ACCENTED = new Map(
  Array.from(ACCENTED, (letter, index) => [letter, PLAIN.charAt(index)])
);

/**
 * Comparison key for place names: case-insensitive, trimmed, with runs of
 * whitespace collapsed and common Latin diacritics removed, so that "Pepco",
 * " pepco " and "PEPCO" are the same place.
 */
export function placeNameKey(name: string): string {
  return Array.from(
    name.toLowerCase().replace(/\s+/g, ' ').trim(),
    (letter) => PLAIN_BY_ACCENTED.get(letter) ?? letter
  ).join('');
}

/** First place whose name has the same key as `name`, ignoring `exceptId`. */
export function findPlaceByName<
  T extends { readonly id: string; readonly name: string }
>(
  places: readonly T[],
  name: string,
  exceptId: string | null = null
): T | undefined {
  const key = placeNameKey(name);

  return places.find(
    (place) => place.id !== exceptId && placeNameKey(place.name) === key
  );
}

/** Groups of two or more places whose names have the same key. */
export function duplicatePlaceGroups<
  T extends { readonly id: string; readonly name: string }
>(places: readonly T[]): readonly (readonly T[])[] {
  const groups = new Map<string, T[]>();

  for (const place of places) {
    const key = placeNameKey(place.name);

    groups.set(key, [...(groups.get(key) ?? []), place]);
  }

  return [...groups.values()].filter((group) => group.length > 1);
}

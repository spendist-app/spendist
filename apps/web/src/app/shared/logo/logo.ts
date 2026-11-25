import { placeNameKey } from '../place-name/place-name';

/**
 * Brand logos of places and recurring payments.
 *
 * A stored logo is a short string with one of two shapes, mirrored by the
 * `*_logo_format` CHECK constraints in
 * supabase/migrations/202611251600_add_logos.sql:
 *   simple-icons:<slug>:<hex>   an icon bundled under /logos/simple-icons/;
 *   file:<uuid>.<webp|png>      an image in the owner's folder of the `logos`
 *                               Storage bucket.
 */

export const LOGO_BUCKET = 'logos';

/** Longest edge of a stored logo image, in CSS pixels at 3x density. */
export const LOGO_MAX_EDGE = 192;

/** Largest image a user can pick before it is downscaled. */
export const LOGO_SOURCE_MAX_BYTES = 5 * 1024 * 1024;

/** Mirrors the `logos` bucket's file size limit. */
export const LOGO_STORED_MAX_BYTES = 262_144;

export const LOGO_SOURCE_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
];

export const LOGO_STORED_EXTENSIONS = new Map([
  ['image/webp', 'webp'],
  ['image/png', 'png'],
]);

export type Logo =
  | {
      readonly kind: 'simple-icons';
      readonly slug: string;
      readonly hex: string;
    }
  | {
      readonly kind: 'file';
      readonly fileName: string;
    };

/** An image chosen in the picker that is uploaded when the form is saved. */
export interface PendingLogoFile {
  readonly blob: Blob;
  readonly previewUrl: string;
}

/**
 * The logo a form will save: `pending` wins over `value` and is uploaded
 * first; otherwise `value` is stored as it is (null removes the logo).
 */
export interface LogoDraft {
  readonly value: string | null;
  readonly pending: PendingLogoFile | null;
}

const SIMPLE_ICON_PATTERN = /^simple-icons:([a-z0-9_]{1,64}):([0-9a-f]{6})$/;

const FILE_PATTERN =
  /^file:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:webp|png))$/;

export function parseLogo(value: string | null | undefined): Logo | null {
  if (!value) return null;

  const simpleIcon = SIMPLE_ICON_PATTERN.exec(value);

  if (simpleIcon) {
    return { kind: 'simple-icons', slug: simpleIcon[1], hex: simpleIcon[2] };
  }

  const file = FILE_PATTERN.exec(value);

  return file ? { kind: 'file', fileName: file[1] } : null;
}

/** Stored value of a bundled Simple Icons logo, or null for invalid input. */
export function simpleIconLogo(slug: string, hex: string): string | null {
  const value = `simple-icons:${slug}:${hex.toLowerCase()}`;

  return parseLogo(value) ? value : null;
}

export function fileLogo(fileName: string): string | null {
  const value = `file:${fileName}`;

  return parseLogo(value) ? value : null;
}

/** Path of a bundled Simple Icons glyph. */
export function simpleIconPath(slug: string): string {
  return `/logos/simple-icons/${slug}.svg`;
}

export function emptyLogoDraft(value: string | null = null): LogoDraft {
  return { value, pending: null };
}

/**
 * Whether a glyph drawn on a tile of this colour should be light or dark:
 * the one with the higher WCAG contrast against the tile.
 */
export function logoGlyphTone(hex: string): 'light' | 'dark' {
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;

    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });

  const luminance =
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];

  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;

  return contrastWithWhite >= contrastWithBlack ? 'light' : 'dark';
}

export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

/** Scales a size down, never up, so its longest edge fits `max`. */
export function fitWithin(
  width: number,
  height: number,
  max: number
): ImageSize {
  const scale = Math.min(1, max / Math.max(width, height, 1));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Search key for brand names: letters and digits only, no diacritics. */
export function catalogKey(text: string): string {
  return placeNameKey(text).replace(/[^a-z0-9]/g, '');
}

export interface CatalogEntry {
  readonly title: string;
  /** Search keys built with `catalogKey`. */
  readonly keys: readonly string[];
}

/**
 * Entries whose keys match the query: exact matches first, then prefixes,
 * then other substrings; shorter titles first within each group.
 */
export function searchCatalog<T extends CatalogEntry>(
  entries: readonly T[],
  query: string,
  limit: number
): readonly T[] {
  const key = catalogKey(query);

  if (!key) return [];

  const rank = (entry: T): number => {
    if (entry.keys.includes(key)) return 0;

    if (entry.keys.some((candidate) => candidate.startsWith(key))) return 1;

    return entry.keys.some((candidate) => candidate.includes(key)) ? 2 : 3;
  };

  return entries
    .flatMap((entry) => {
      const entryRank = rank(entry);

      return entryRank < 3 ? [{ entry, rank: entryRank }] : [];
    })
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        left.entry.title.length - right.entry.title.length ||
        left.entry.title.localeCompare(right.entry.title)
    )
    .slice(0, limit)
    .map((match) => match.entry);
}

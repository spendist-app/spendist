import * as heroIconsMicro from '@ng-icons/heroicons/micro';
import * as heroIconsMini from '@ng-icons/heroicons/mini';
import * as heroIconsOutline from '@ng-icons/heroicons/outline';
import * as heroIconsSolid from '@ng-icons/heroicons/solid';

export interface HeroIconOption {
  readonly name: string;
  readonly label: string;
}

const HERO_ICON_SOURCES = [heroIconsOutline, heroIconsSolid, heroIconsMini, heroIconsMicro] as const;

const HERO_ICON_LOOKUP = new Map<string, string>();

for (const source of HERO_ICON_SOURCES) {
  for (const [name, svg] of Object.entries(source)) {
    if (typeof svg === 'string' && !HERO_ICON_LOOKUP.has(name)) {
      HERO_ICON_LOOKUP.set(name, svg);
    }
  }
}

export const heroIconOptions: readonly HeroIconOption[] = Array.from(HERO_ICON_LOOKUP.keys())
  .map((name) => ({
    name,
    label: formatHeroIconLabel(name),
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function heroIconSvg(keyword: string | null | undefined): string | null {
  if (!keyword) {
    return null;
  }

  const trimmed = keyword.trim();
  if (!trimmed) {
    return null;
  }

  if (HERO_ICON_LOOKUP.has(trimmed)) {
    return HERO_ICON_LOOKUP.get(trimmed) ?? null;
  }

  const canonical = canonicalHeroIconName(trimmed);
  if (!canonical) {
    return null;
  }

  return HERO_ICON_LOOKUP.get(canonical) ?? null;
}

export function canonicalHeroIconName(keyword: string | null | undefined): string {
  if (!keyword) {
    return '';
  }

  const trimmed = keyword.trim();
  if (!trimmed) {
    return '';
  }

  if (HERO_ICON_LOOKUP.has(trimmed)) {
    return trimmed;
  }

  const camelCandidate = trimmed.replace(/^Hero/, 'hero');
  if (/^hero[A-Z]/.test(camelCandidate) && HERO_ICON_LOOKUP.has(camelCandidate)) {
    return camelCandidate;
  }

  const sanitized = trimmed
    .replace(/^heroicons?:?/i, '')
    .replace(/^hero/i, '')
    .trim();

  if (!sanitized) {
    return '';
  }

  const spaced = sanitized
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase();

  const segments = spaced
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));

  if (!segments.length) {
    return '';
  }

  const candidate = `hero${segments.join('')}`;
  return HERO_ICON_LOOKUP.has(candidate) ? candidate : '';
}

export function isHeroIconName(keyword: string | null | undefined): boolean {
  return canonicalHeroIconName(keyword) !== '';
}

export function formatHeroIconLabel(name: string): string {
  const trimmed = name.replace(/^hero/, '');
  if (!trimmed) {
    return 'Outline';
  }

  const variantMatch = trimmed.match(/(Solid|Mini|Micro)$/);
  const variant = variantMatch?.[1] ?? 'Outline';
  const core = variantMatch ? trimmed.slice(0, -variant.length) : trimmed;
  const words = core.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();

  if (!words) {
    return variant === 'Outline' ? 'Outline' : variant;
  }

  return variant === 'Outline' ? words : `${words} (${variant})`;
}


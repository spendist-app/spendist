import { Injectable } from '@angular/core';
import { z } from 'zod';
import { type CatalogEntry, catalogKey, simpleIconLogo } from './logo';

/** Index shipped with the pinned simple-icons package; see apps/web/project.json. */
const SIMPLE_ICONS_INDEX = '/logos/simple-icons.json';

/**
 * Dashboard Icons on jsDelivr. jsDelivr refuses commit-pinned URLs for this
 * repository because it exceeds the 50 MB package limit, so the branch is
 * used. Picked images are copied into the user's own storage, so later
 * changes upstream never alter a saved logo.
 */
const DASHBOARD_ICONS_BASE =
  'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@main';

const SimpleIconsIndexSchema = z.array(
  z.object({
    title: z.string(),
    slug: z.string(),
    hex: z.string().regex(/^[0-9a-fA-F]{6}$/),
    aliases: z.object({ aka: z.array(z.string()).optional() }).optional(),
  })
);

const DashboardIconsIndexSchema = z.object({ webp: z.array(z.string()) });

export interface SimpleIconCandidate extends CatalogEntry {
  readonly source: 'simple-icons';
  readonly slug: string;
  readonly hex: string;
  /** Stored logo value. */
  readonly value: string;
}

export interface DashboardIconCandidate extends CatalogEntry {
  readonly source: 'dashboard-icons';
  readonly slug: string;
  readonly imageUrl: string;
}

/**
 * Brand catalogues for the logo picker. Each index is fetched once, when the
 * picker first needs it; a failed fetch is retried on the next call.
 */
@Injectable({ providedIn: 'root' })
export class LogoCatalogService {
  private simpleIcons: Promise<readonly SimpleIconCandidate[]> | null = null;
  private dashboardIcons: Promise<readonly DashboardIconCandidate[]> | null =
    null;

  loadSimpleIcons(): Promise<readonly SimpleIconCandidate[]> {
    this.simpleIcons ??= this.fetchSimpleIcons().catch((error) => {
      this.simpleIcons = null;
      throw error;
    });

    return this.simpleIcons;
  }

  loadDashboardIcons(): Promise<readonly DashboardIconCandidate[]> {
    this.dashboardIcons ??= this.fetchDashboardIcons().catch((error) => {
      this.dashboardIcons = null;
      throw error;
    });

    return this.dashboardIcons;
  }

  /** Downloads a Dashboard Icons image so it can be stored as a file logo. */
  async downloadDashboardIcon(
    candidate: DashboardIconCandidate
  ): Promise<Blob> {
    const response = await fetch(candidate.imageUrl, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    }).catch(() => null);

    if (!response?.ok) {
      throw new Error('logos.errors.download');
    }

    return response.blob();
  }

  private async fetchSimpleIcons(): Promise<readonly SimpleIconCandidate[]> {
    const response = await fetch(SIMPLE_ICONS_INDEX).catch(() => null);

    if (!response?.ok) {
      throw new Error('logos.errors.catalog');
    }

    const parsed = SimpleIconsIndexSchema.safeParse(await response.json());

    if (!parsed.success) {
      throw new Error('logos.errors.catalog');
    }

    return parsed.data.flatMap((icon) => {
      const value = simpleIconLogo(icon.slug, icon.hex);

      return value
        ? [
            {
              source: 'simple-icons' as const,
              slug: icon.slug,
              hex: icon.hex.toLowerCase(),
              title: icon.title,
              value,
              keys: [icon.title, icon.slug, ...(icon.aliases?.aka ?? [])].map(
                catalogKey
              ),
            },
          ]
        : [];
    });
  }

  private async fetchDashboardIcons(): Promise<
    readonly DashboardIconCandidate[]
  > {
    const response = await fetch(`${DASHBOARD_ICONS_BASE}/tree.json`, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    }).catch(() => null);

    if (!response?.ok) {
      throw new Error('logos.errors.catalog');
    }

    const parsed = DashboardIconsIndexSchema.safeParse(await response.json());

    if (!parsed.success) {
      throw new Error('logos.errors.catalog');
    }

    return parsed.data.webp.flatMap((fileName) => {
      const slug = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.webp$/.exec(fileName)?.[1];

      // Light and dark variants repeat the base icon in the results.
      if (!slug || /-(?:light|dark)$/.test(slug)) return [];

      const title = slug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return [
        {
          source: 'dashboard-icons' as const,
          slug,
          title,
          imageUrl: `${DASHBOARD_ICONS_BASE}/webp/${slug}.webp`,
          keys: [catalogKey(slug)],
        },
      ];
    });
  }
}

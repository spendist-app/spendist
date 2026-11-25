import type { ActivatedRouteSnapshot } from '@angular/router';

/** The part of Angular's `ViewTransitionInfo` this hook uses. */
export interface PageTransition {
  readonly transition: { skipTransition(): void };
  readonly from: ActivatedRouteSnapshot;
  readonly to: ActivatedRouteSnapshot;
}

/**
 * Cross-fades between pages with the View Transitions API (Angular's
 * `withViewTransitions`). Browsers without the API navigate instantly.
 *
 * The transition is skipped:
 * - when only query parameters or the fragment change (for example
 *   transaction filters), so the list updates in place instead of the whole
 *   page fading;
 * - when the user prefers reduced motion.
 */
export function onViewTransitionCreated({
  transition,
  from,
  to,
}: PageTransition): void {
  if (routePath(from) === routePath(to) || prefersReducedMotion()) {
    transition.skipTransition();
  }
}

/** The matched path of a router state, without query parameters. */
export function routePath(snapshot: ActivatedRouteSnapshot): string {
  const segments: string[] = [];
  let current: ActivatedRouteSnapshot | null = snapshot;

  while (current) {
    segments.push(...current.url.map((segment) => segment.path));
    current = current.firstChild;
  }

  return `/${segments.join('/')}`;
}

function prefersReducedMotion(): boolean {
  return (
    'matchMedia' in globalThis &&
    globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

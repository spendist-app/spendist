/**
 * Centralised application logger.
 *
 * In development (`ngDevMode`) messages are forwarded to the native console
 * so they remain visible in browser DevTools. In production builds the
 * raw Supabase / internal error objects are **never** printed to the
 * console — only a short context tag is logged, keeping attack-surface
 * information out of the browser.
 *
 * Extend the `else` branches below to pipe production errors to an
 * external service (Sentry, LogRocket, etc.) when one is integrated.
 */

type Loggable = unknown;

const isDev = typeof ngDevMode !== 'undefined' && !!ngDevMode;

export function logError(context: string, ...data: Loggable[]): void {
  if (isDev) {
    console.error(`[${context}]`, ...data);
  }
  // Production: silently swallow or forward to an external error tracker.
  // e.g. Sentry.captureException(data[0], { tags: { context } });
}

export function logWarn(context: string, ...data: Loggable[]): void {
  if (isDev) {
    console.warn(`[${context}]`, ...data);
  }
}

export function logInfo(context: string, ...data: Loggable[]): void {
  if (isDev) {
    console.log(`[${context}]`, ...data);
  }
}

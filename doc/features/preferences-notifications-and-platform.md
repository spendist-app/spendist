# Preferences, notifications, and platform behavior

## Language and theme

Spendist supports English and Polish through Transloco. Before authentication it
uses a saved browser preference when present, then a matching browser language
or the English default. After authentication, the language stored in the
user's profile becomes authoritative and updates both the interface and the
document's `lang` attribute.

Profile details in `/settings` are always editable. Full name saves after a
short typing pause or when the field loses focus; language and IANA timezone
save immediately after selection. The interface reports saving, success, or a
retryable failure without a general Save button. A failed language change is
rolled back to the last stored profile value.

Signed-out navigation presents English and Polish as accessible flag buttons. The active flag is visibly selected, and changing it while browsing the blog opens the other language edition's home page. The compact public header keeps its logo, blog link, language control, and authentication actions in one row, including narrow mobile layouts.

The light/dark theme is saved locally. Without a saved value, the browser's dark-mode preference can be used.

## Notifications

The notification menu is scoped to the authenticated user and refreshes through Supabase Realtime. It shows recent records and an unread count; users can mark all unread displayed notifications as read.

Current notification types include automatic recurring transaction creation, a recurring payment ending, and exchange-rate synchronisation failure.

## Platform behavior

The application is mobile-first Angular with SSR/hydration, zoneless change detection, and a production service worker. A Cloudflare Worker serves it, adds security headers, and exposes public runtime configuration through `/env.js`.

Static assets, including `robots.txt` and `sitemap.xml`, are in `apps/web/public/`. The landing page at `/` is currently the only indexable content route.

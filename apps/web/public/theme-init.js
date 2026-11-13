// Applies the saved (or system) colour theme before the first paint, so a
// dark-theme user never sees the light page while Angular boots. Loaded as a
// blocking script in <head>; keep it tiny. ThemeService takes over after boot
// and uses the same storage key and theme names.
(function () {
  let theme = null;

  try {
    const stored = window.localStorage.getItem('spendist-theme');

    if (stored === 'spendistLight' || stored === 'spendistDark') {
      theme = stored;
    }
  } catch {
    // Storage can be blocked; fall back to the system preference.
  }

  if (!theme) {
    try {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'spendistDark'
        : 'spendistLight';
    } catch {
      theme = 'spendistLight';
    }
  }

  document.documentElement.setAttribute('data-theme', theme);
})();

// Applies the saved (or system) colour theme before the first paint, so a
// dark-theme user never sees the light page while Angular boots. Loaded as a
// blocking script in <head>, after the color-scheme and theme-color metas;
// keep it tiny. ThemeService takes over after boot and uses the same storage
// key, theme names and colours.
(function () {
  const colors = { spendistLight: '#ffffff', spendistDark: '#161a1d' };
  let stored = null;

  try {
    const value = window.localStorage.getItem('spendist-theme');

    if (value === 'spendistLight' || value === 'spendistDark') {
      stored = value;
    }
  } catch {
    // Storage can be blocked; fall back to the system preference.
  }

  let theme = stored;

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

  // Without an override the metas keep their light/dark defaults.
  if (!stored) return;

  const scheme = document.querySelector('meta[name="color-scheme"]');

  if (scheme) {
    scheme.content = stored === 'spendistDark' ? 'dark' : 'light';
  }

  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.content = colors[stored];
  });
})();

// This disposable document has no application DOM, form fields or SPA history.
// It is created only after consent, for a resolved signed-out public page.
(() => {
  const measurementId = 'G-WY8ZY07NGW';
  let initialized = false;
  window['ga-disable-G-WY8ZY07NGW'] = true;

  window.addEventListener('message', (event) => {
    if (event.source !== parent || event.origin !== location.origin) {
      return;
    }

    const payload = event.data;

    if (payload?.type === 'spendist-analytics-stop') {
      window['ga-disable-G-WY8ZY07NGW'] = true;

      return;
    }

    const path = /^\/(?:[a-z0-9/-]*)$/.exec(payload?.path)?.[0];

    if (initialized || payload?.type !== 'spendist-analytics-start' || !path) {
      return;
    }

    initialized = true;
    window['ga-disable-G-WY8ZY07NGW'] = false;
    window.dataLayer = [];

    function gtag() {
      // Google's command queue requires an Arguments object, not a rest array.
      // valueOf returns that same object without changing the protocol.
      window.dataLayer.push(arguments.valueOf());
    }

    const pageLocation = location.origin + path;
    gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    gtag('js', new Date());
    gtag('config', measurementId, {
      send_page_view: false,
      page_location: pageLocation,
      page_referrer: '',
      page_title: 'Spendist',
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_domain: 'none',
      cookie_expires: 180 * 24 * 60 * 60,
      cookie_update: false,
      cookie_flags: 'SameSite=Lax;Secure',
    });
    gtag('event', 'page_view', {
      send_to: measurementId,
      page_location: pageLocation,
      page_referrer: '',
      page_title: 'Spendist',
    });

    const script = document.createElement('script');
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.append(script);
  });

  // A direct visit to this utility document never initializes the Google tag.
  if (parent !== window) {
    parent.postMessage({ type: 'spendist-analytics-ready' }, location.origin);
  }
})();

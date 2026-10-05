import worker from '../../../worker';

const assets = {
  ASSETS: { fetch: async () => new Response('<html></html>') },
};

describe('analytics Worker headers', () => {
  it.each(['/analytics/frame.html', '/analytics/frame'])(
    'permits Google only in the utility frame and prevents indexing/referrer leakage: %s',
    async (path) => {
      const response = await worker.fetch(
        new Request(`https://spendist.app${path}`),
        assets
      );

      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("frame-ancestors 'self'");
      expect(csp).toContain(
        "script-src 'self' https://www.googletagmanager.com"
      );
      expect(csp).toContain("form-action 'none'");
      expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
      expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    }
  );

  it.each(['/', '/login', '/transactions'])(
    'keeps Google scripts blocked in the application document: %s',
    async (path) => {
      const response = await worker.fetch(
        new Request(`https://spendist.app${path}`),
        assets
      );

      expect(response.headers.get('Content-Security-Policy')).toContain(
        "script-src 'self';"
      );
      expect(response.headers.get('Content-Security-Policy')).not.toContain(
        'googletagmanager'
      );
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    }
  );
});

describe('analytics local development', () => {
  it('keeps production HTTPS upgrades and permits same-origin HTTP loopback frames', async () => {
    const local = await worker.fetch(
      new Request('http://127.0.0.1:4318/'),
      assets
    );

    const production = await worker.fetch(
      new Request('https://spendist.app/'),
      assets
    );

    expect(local.headers.get('Content-Security-Policy')).not.toContain(
      'upgrade-insecure-requests'
    );
    expect(local.headers.get('Content-Security-Policy')).toContain(
      "script-src 'self';"
    );
    expect(production.headers.get('Content-Security-Policy')).toContain(
      'upgrade-insecure-requests'
    );
  });
});

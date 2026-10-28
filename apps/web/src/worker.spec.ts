import { describe, expect, it, vi } from 'vitest';
import worker from '../worker';

describe('HTML fallback at the production Worker', () => {
  it.each(['GET', 'HEAD'])(
    'serves a fallback body without an index.html redirect for %s',
    async (method) => {
      const requestedPaths: string[] = [];

      const response = await worker.fetch(
        new Request('https://spendist.app/unknown-page', {
          method,
          headers: { accept: 'text/html' },
        }),
        {
          ASSETS: {
            fetch: async (request: Request) => {
              const pathname = new URL(request.url).pathname;

              requestedPaths.push(pathname);
              expect(request.method).toBe(method);

              if (pathname === '/index.html') {
                return new Response(null, {
                  status: 307,
                  headers: { location: '/' },
                });
              }

              return pathname === '/'
                ? new Response(
                    method === 'HEAD' ? null : '<app-root></app-root>'
                  )
                : new Response(null, { status: 404 });
            },
          },
        }
      );

      expect(requestedPaths).toEqual(['/unknown-page', '/']);
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
      expect(await response.text()).toBe(
        method === 'HEAD' ? '' : '<app-root></app-root>'
      );
    }
  );
});

describe('administrator navigation at the production Worker', () => {
  it('serves public production runtime configuration ahead of a local asset', async () => {
    const fetchAsset = vi.fn(
      async () => new Response('local configuration must not be served')
    );

    const response = await worker.fetch(
      new Request('https://spendist.app/env.js'),
      {
        ASSETS: { fetch: fetchAsset },
        SUPABASE_URL: 'https://production.example',
        SUPABASE_PUBLISHABLE_KEY: 'fake-public-test-key',
        NG_APP_TURNSTILE_SITE_KEY: 'fake-turnstile-site-key',
      }
    );

    const body = await response.text();
    const policy = response.headers.get('Content-Security-Policy') ?? '';

    expect(fetchAsset).not.toHaveBeenCalled();
    expect(body).toContain('https://production.example');
    expect(body).not.toContain('127.0.0.1');
    expect(body).toContain(
      '"NG_APP_TURNSTILE_SITE_KEY":"fake-turnstile-site-key"'
    );
    expect(policy).toMatch(
      /script-src 'self' https:\/\/challenges\.cloudflare\.com;/
    );
    expect(policy).toMatch(
      /frame-src 'self' https:\/\/challenges\.cloudflare\.com;/
    );
    expect(response.headers.get('Content-Security-Policy')).not.toMatch(
      /localhost|127\.0\.0\.1/
    );
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it.each(['/admin', '/admin/'])(
    'serves the client shell for direct navigation to %s',
    async (path) => {
      const fetchAsset = vi.fn(
        async (request: Request) =>
          new Response(
            new URL(request.url).pathname === '/index.csr'
              ? '<app-root></app-root>'
              : '<meta http-equiv="refresh" content="0; url=/login">',
            { headers: { 'Cache-Control': 'public, max-age=600' } }
          )
      );

      const response = await worker.fetch(
        new Request('https://spendist.app' + path, {
          headers: { Cookie: 'session=opaque-test-session' },
        }),
        { ASSETS: { fetch: fetchAsset } }
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('<app-root></app-root>');
      expect(response.headers.get('Cache-Control')).toContain('no-store');
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    }
  );

  it('keeps HEAD checks on the same protected navigation path', async () => {
    const fetchAsset = vi.fn(async (request: Request) => {
      expect(request.method).toBe('HEAD');
      expect(new URL(request.url).pathname).toBe('/index.csr');

      return new Response(null);
    });

    const response = await worker.fetch(
      new Request('https://spendist.app/admin', { method: 'HEAD' }),
      { ASSETS: { fetch: fetchAsset } }
    );

    expect(await response.text()).toBe('');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
});

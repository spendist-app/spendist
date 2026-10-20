import worker from '../../../../worker';

describe('blog Worker routing', () => {
  it.each(['pl', 'en'])(
    'returns the %s branded page with an HTTP 404 status',
    async (locale) => {
      const requestedPaths: string[] = [];

      const response = await worker.fetch(
        new Request(`https://spendist.app/${locale}/blog/nie-istnieje`, {
          headers: { accept: 'text/html' },
        }),
        {
          ASSETS: {
            fetch: async (request: Request) => {
              const pathname = new URL(request.url).pathname;
              requestedPaths.push(pathname);

              if (pathname.endsWith('/index.html')) {
                return new Response(null, {
                  status: 307,
                  headers: { location: `/${locale}/blog-not-found` },
                });
              }

              return pathname === `/${locale}/blog-not-found`
                ? new Response('<h1>Nie znaleziono artykułu</h1>', {
                    headers: { 'content-type': 'text/html; charset=utf-8' },
                  })
                : new Response(null, { status: 404 });
            },
          },
        }
      );

      expect(requestedPaths).toEqual([
        `/${locale}/blog/nie-istnieje`,
        `/${locale}/blog-not-found`,
      ]);
      expect(response.status).toBe(404);
      expect(await response.text()).toContain('Nie znaleziono artykułu');
      expect(response.headers.get('Location')).toBeNull();
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex, follow');
      expect(response.headers.get('Content-Security-Policy')).toContain(
        "default-src 'self'"
      );
    }
  );

  it('adds a noindex response header to tag-filtered archives', async () => {
    const response = await worker.fetch(
      new Request('https://spendist.app/en/blog?tag=privacy', {
        headers: { accept: 'text/html' },
      }),
      {
        ASSETS: {
          fetch: async () => new Response('<h1>Spendist Blog</h1>'),
        },
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, follow');
  });

  it.each([
    ['/llms.txt', '/llm.txt'],
    ['/llms-full.txt', '/llm-full.txt'],
  ])(
    'serves %s from the repository LLM asset',
    async (publicPath, assetPath) => {
      const requestedPaths: string[] = [];

      const response = await worker.fetch(
        new Request(`https://spendist.app${publicPath}`),
        {
          ASSETS: {
            fetch: async (request: Request) => {
              requestedPaths.push(new URL(request.url).pathname);

              return new Response('# Spendist');
            },
          },
        }
      );

      expect(requestedPaths).toEqual([assetPath]);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe(
        'text/plain; charset=utf-8'
      );
    }
  );
});

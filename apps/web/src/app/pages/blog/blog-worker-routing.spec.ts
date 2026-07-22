import worker from '../../../../worker';

describe('blog Worker routing', () => {
  it('returns the localized branded page with an HTTP 404 status', async () => {
    const requestedPaths: string[] = [];
    const response = await worker.fetch(
      new Request('https://spendist.app/pl/blog/nie-istnieje', {
        headers: { accept: 'text/html' },
      }),
      {
        ASSETS: {
          fetch: async (request: Request) => {
            const pathname = new URL(request.url).pathname;
            requestedPaths.push(pathname);
            return pathname === '/pl/blog-not-found/index.html'
              ? new Response('<h1>Nie znaleziono artykułu</h1>', {
                  headers: { 'content-type': 'text/html; charset=utf-8' },
                })
              : new Response(null, { status: 404 });
          },
        },
      }
    );

    expect(requestedPaths).toEqual([
      '/pl/blog/nie-istnieje',
      '/pl/blog-not-found/index.html',
    ]);
    expect(response.status).toBe(404);
    expect(await response.text()).toContain('Nie znaleziono artykułu');
    expect(response.headers.get('Content-Security-Policy')).toContain(
      "default-src 'self'"
    );
  });

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
});

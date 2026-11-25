import { TestBed } from '@angular/core/testing';
import { LogoCatalogService } from './logo-catalog.service';

const BYPASS = /[?&]ngsw-bypass=1$/;

describe('LogoCatalogService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends Dashboard Icons requests past the service worker', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('tree.json')
        ? Response.json({ webp: ['netflix.webp', 'netflix-dark.webp'] })
        : new Response(new Blob(['webp'], { type: 'image/webp' }))
    );

    vi.stubGlobal('fetch', fetchMock);
    const service = TestBed.inject(LogoCatalogService);

    const [netflix] = await service.loadDashboardIcons();
    await service.downloadDashboardIcon(netflix);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      expect.stringMatching(BYPASS),
      expect.stringMatching(BYPASS),
    ]);
    expect(netflix.imageUrl).toBe(
      'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@main/webp/netflix.webp?ngsw-bypass=1'
    );
  });
});

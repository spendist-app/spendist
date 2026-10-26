import { ConnectedAppsCard, SPENDIST_MCP_URL } from './connected-apps-card';

describe('ConnectedAppsCard', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('points users at the production MCP endpoint', () => {
    expect(SPENDIST_MCP_URL).toBe('https://mcp.spendist.app/mcp');
  });

  it('copies the MCP server URL and confirms it', async () => {
    const writeText = vi.fn(async () => undefined);

    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const card = new ConnectedAppsCard();

    await card.copy();

    expect(writeText).toHaveBeenCalledWith(SPENDIST_MCP_URL);
    expect(card.copied()).toBe(true);
  });

  it('keeps the copy label when the clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn(async () => Promise.reject(new Error())) },
    });

    const card = new ConnectedAppsCard();

    await card.copy();

    expect(card.copied()).toBe(false);
  });
});

import type { AuthInfo } from '@modelcontextprotocol/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SupabaseTokenVerifier } from './auth';
import type { McpEnvironment } from './config';
import app from './worker';

const env: McpEnvironment = {
  SUPABASE_URL: 'https://spendist-test.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key',
  MCP_RESOURCE_URL: 'https://mcp.spendist.app/mcp',
  MCP_ALLOWED_AUDIENCE: 'https://mcp.spendist.app/mcp',
  MCP_OAUTH_ISSUER: 'https://spendist-test.supabase.co/auth/v1',
  MCP_ALLOWED_HOSTS: 'mcp.spendist.app',
};

const authInfo: AuthInfo = {
  token: 'verified-access-token',
  clientId: 'test-client',
  scopes: [],
  expiresAt: Math.floor(Date.now() / 1000) + 300,
  resource: new URL(env.MCP_RESOURCE_URL),
  extra: { userId: 'test-user' },
};

function authorizedRequest(body: object, headers: HeadersInit = {}): Request {
  return new Request(env.MCP_RESOURCE_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-token',
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      Host: 'mcp.spendist.app',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

afterEach(() => vi.restoreAllMocks());

describe('Spendist MCP Worker', () => {
  it('reports the current MCP protocol revision', async () => {
    const response = await app.request('https://mcp.spendist.app/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      service: 'spendist-mcp',
      protocolVersion: '2026-07-28',
    });
  });

  it('serves path-aware protected resource metadata', async () => {
    const response = await app.request(
      'https://mcp.spendist.app/.well-known/oauth-protected-resource/mcp',
      undefined,
      env
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    await expect(response.json()).resolves.toMatchObject({
      resource: env.MCP_RESOURCE_URL,
      authorization_servers: [env.MCP_OAUTH_ISSUER],
      resource_name: 'Spendist MCP',
    });
  });

  it('advertises the Supabase dynamic client registration endpoint', async () => {
    const response = await app.request(
      'https://mcp.spendist.app/.well-known/oauth-authorization-server',
      undefined,
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      issuer: env.MCP_OAUTH_ISSUER,
      registration_endpoint: `${env.MCP_OAUTH_ISSUER}/oauth/clients/register`,
    });
  });

  it('challenges unauthenticated requests with RFC 9728 metadata', async () => {
    const response = await app.request(
      env.MCP_RESOURCE_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Host: 'mcp.spendist.app',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'server/discover',
        }),
      },
      env
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain(
      'resource_metadata="https://mcp.spendist.app/.well-known/oauth-protected-resource/mcp"'
    );
  });

  it('rejects an untrusted browser origin before token verification', async () => {
    const verify = vi.spyOn(
      SupabaseTokenVerifier.prototype,
      'verifyAccessToken'
    );
    const response = await app.request(
      authorizedRequest(
        { jsonrpc: '2.0', id: 1, method: 'server/discover' },
        { Origin: 'https://attacker.example' }
      ),
      undefined,
      env
    );

    expect(response.status).toBe(403);
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects an untrusted Host header before token verification', async () => {
    const verify = vi.spyOn(
      SupabaseTokenVerifier.prototype,
      'verifyAccessToken'
    );
    const response = await app.request(
      authorizedRequest(
        { jsonrpc: '2.0', id: 1, method: 'server/discover' },
        { Host: 'attacker.example' }
      ),
      undefined,
      env
    );

    expect(response.status).toBe(403);
    expect(verify).not.toHaveBeenCalled();
  });

  it('serves the 2026-07-28 discovery request', async () => {
    vi.spyOn(
      SupabaseTokenVerifier.prototype,
      'verifyAccessToken'
    ).mockResolvedValue(authInfo);
    const response = await app.request(
      authorizedRequest(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'server/discover',
          params: {
            _meta: {
              'io.modelcontextprotocol/protocolVersion': '2026-07-28',
              'io.modelcontextprotocol/clientCapabilities': {},
              'io.modelcontextprotocol/clientInfo': {
                name: 'spendist-test-client',
                version: '1.0.0',
              },
            },
          },
        },
        {
          'MCP-Protocol-Version': '2026-07-28',
          'Mcp-Method': 'server/discover',
        }
      ),
      undefined,
      env
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      result?: {
        resultType?: string;
        supportedVersions?: string[];
        _meta?: Record<string, unknown>;
      };
    };
    expect(payload.result).toMatchObject({
      resultType: 'complete',
      supportedVersions: ['2026-07-28'],
    });
    expect(payload.result?._meta).toHaveProperty(
      'io.modelcontextprotocol/serverInfo'
    );
  });

  it('rejects modern MCP headers that disagree with the request body', async () => {
    vi.spyOn(
      SupabaseTokenVerifier.prototype,
      'verifyAccessToken'
    ).mockResolvedValue(authInfo);
    const response = await app.request(
      authorizedRequest(
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'server/discover',
          params: {
            _meta: {
              'io.modelcontextprotocol/protocolVersion': '2026-07-28',
              'io.modelcontextprotocol/clientCapabilities': {},
            },
          },
        },
        {
          'MCP-Protocol-Version': '2026-07-28',
          'Mcp-Method': 'tools/list',
        }
      ),
      undefined,
      env
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: -32020 },
    });
  });

  it('returns modern cache fields on tools/list', async () => {
    vi.spyOn(
      SupabaseTokenVerifier.prototype,
      'verifyAccessToken'
    ).mockResolvedValue(authInfo);
    const response = await app.request(
      authorizedRequest(
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {
            _meta: {
              'io.modelcontextprotocol/protocolVersion': '2026-07-28',
              'io.modelcontextprotocol/clientCapabilities': {},
              'io.modelcontextprotocol/clientInfo': {
                name: 'spendist-test-client',
                version: '1.0.0',
              },
            },
          },
        },
        {
          'MCP-Protocol-Version': '2026-07-28',
          'Mcp-Method': 'tools/list',
        }
      ),
      undefined,
      env
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      result?: {
        resultType?: string;
        ttlMs?: number;
        cacheScope?: string;
        tools?: Array<{ name: string; inputSchema?: { $schema?: string } }>;
      };
    };
    expect(payload.result).toMatchObject({
      resultType: 'complete',
      ttlMs: 0,
      cacheScope: 'private',
    });
    expect(payload.result?.tools?.slice(0, 2).map(({ name }) => name)).toEqual([
      'get_profile',
      'list_currencies',
    ]);
    expect(payload.result?.tools?.[0]?.inputSchema?.$schema).toBe(
      'https://json-schema.org/draft/2020-12/schema'
    );
  });

  it('retains the stateless 2025 initialize fallback', async () => {
    vi.spyOn(
      SupabaseTokenVerifier.prototype,
      'verifyAccessToken'
    ).mockResolvedValue(authInfo);
    const response = await app.request(
      authorizedRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'legacy-test-client', version: '1.0.0' },
        },
      }),
      undefined,
      env
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    await expect(response.text()).resolves.toContain(
      '"protocolVersion":"2025-11-25"'
    );
  });
});

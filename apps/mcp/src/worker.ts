import {
  buildOAuthProtectedResourceMetadata,
  createMcpHandler,
  getOAuthProtectedResourceMetadataUrl,
  hostHeaderValidationResponse,
  oauthMetadataResponse,
  originValidationResponse,
  preloadSchemas,
  requireBearerAuth,
  type AuthMetadataOptions,
  type McpHttpHandler,
} from '@modelcontextprotocol/server';
import { Hono } from 'hono';
import { requireEnvironment, type McpEnvironment } from './config';
import { SupabaseTokenVerifier } from './auth';
import { createSpendistMcpServer } from './server';

preloadSchemas();

const app = new Hono();
const handlers = new WeakMap<McpEnvironment, McpHttpHandler>();
const MODERN_PROTOCOL_VERSION = '2026-07-28';

function oauthMetadata(env: McpEnvironment) {
  const issuer = env.MCP_OAUTH_ISSUER.replace(/\/$/u, '');
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  };
}

function protectedResource(env: McpEnvironment) {
  return buildOAuthProtectedResourceMetadata(metadataOptions(env));
}

function metadataOptions(env: McpEnvironment): AuthMetadataOptions {
  return {
    oauthMetadata: oauthMetadata(env),
    resourceServerUrl: new URL(env.MCP_RESOURCE_URL),
    serviceDocumentationUrl: new URL('https://spendist.app/docs/mcp'),
    resourceName: 'Spendist MCP',
  };
}

function allowedHosts(env: McpEnvironment): string[] {
  return [
    new URL(env.MCP_RESOURCE_URL).hostname,
    ...(env.MCP_ALLOWED_HOSTS?.split(',') ?? []),
  ]
    .map((host) => host.trim())
    .filter(
      (host, index, hosts) => Boolean(host) && hosts.indexOf(host) === index
    );
}

function handlerFor(env: McpEnvironment): McpHttpHandler {
  const current = handlers.get(env);
  if (current) return current;

  const handler = createMcpHandler(
    ({ authInfo }) => {
      if (!authInfo) {
        throw new Error('Authenticated MCP request context is required.');
      }
      return createSpendistMcpServer({
        supabaseUrl: env.SUPABASE_URL,
        publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
        accessToken: authInfo.token,
        clientId: authInfo.clientId,
      });
    },
    { legacy: 'stateless' }
  );
  handlers.set(env, handler);
  return handler;
}

function metadataDocumentResponse(
  request: Request,
  metadata: object
): Response {
  const headers = { 'Access-Control-Allow-Origin': '*' };
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      },
    });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return Response.json(
      { error: 'method_not_allowed' },
      { status: 405, headers: { ...headers, Allow: 'GET, HEAD, OPTIONS' } }
    );
  }
  return request.method === 'HEAD'
    ? new Response(null, { headers })
    : Response.json(metadata, { headers });
}

app.get('/health', (context) =>
  context.json({
    status: 'ok',
    service: 'spendist-mcp',
    version: '1.0.0',
    protocolVersion: MODERN_PROTOCOL_VERSION,
  })
);
app.use('/.well-known/*', async (context, next) => {
  const env = requireEnvironment(context.env as Partial<McpEnvironment>);
  const response = oauthMetadataResponse(context.req.raw, metadataOptions(env));
  if (response) return response;
  return next();
});
app.all('/.well-known/oauth-protected-resource', (context) => {
  const env = requireEnvironment(context.env as Partial<McpEnvironment>);
  return metadataDocumentResponse(context.req.raw, protectedResource(env));
});

app.all('/mcp', async (context) => {
  const env = requireEnvironment(context.env as Partial<McpEnvironment>);
  const hosts = allowedHosts(env);
  const rejected =
    hostHeaderValidationResponse(context.req.raw, hosts) ??
    originValidationResponse(context.req.raw, hosts);
  if (rejected) return rejected;

  const gate = requireBearerAuth({
    verifier: new SupabaseTokenVerifier(env),
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(
      new URL(env.MCP_RESOURCE_URL)
    ),
  });
  const auth = await gate(context.req.raw);
  if (auth instanceof Response) return auth;

  return handlerFor(env).fetch(context.req.raw, { authInfo: auth });
});

export default app;

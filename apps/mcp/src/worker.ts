import { createMcpHonoApp } from '@modelcontextprotocol/hono';
import {
  WebStandardStreamableHTTPServerTransport,
  requireBearerAuth,
} from '@modelcontextprotocol/server';
import { requireEnvironment, type McpEnvironment } from './config';
import { SupabaseTokenVerifier } from './auth';
import { createSpendistMcpServer } from './server';

const app = createMcpHonoApp();

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
  return {
    resource: env.MCP_RESOURCE_URL,
    authorization_servers: [env.MCP_OAUTH_ISSUER],
    bearer_methods_supported: ['header'],
    resource_documentation: 'https://spendist.app/docs/mcp',
  };
}

app.get('/health', (context) =>
  context.json({ status: 'ok', service: 'spendist-mcp', version: '1.0.0' })
);
app.get('/.well-known/oauth-authorization-server', (context) =>
  context.json(
    oauthMetadata(requireEnvironment(context.env as Partial<McpEnvironment>))
  )
);
app.get('/.well-known/oauth-protected-resource', (context) =>
  context.json(
    protectedResource(
      requireEnvironment(context.env as Partial<McpEnvironment>)
    )
  )
);
app.get('/.well-known/oauth-protected-resource/mcp', (context) =>
  context.json(
    protectedResource(
      requireEnvironment(context.env as Partial<McpEnvironment>)
    )
  )
);

app.all('/mcp', async (context) => {
  const env = requireEnvironment(context.env as Partial<McpEnvironment>);
  const allowedHosts =
    env.MCP_ALLOWED_HOSTS?.split(',')
      .map((host) => host.trim())
      .filter(Boolean) ?? [];
  if (
    allowedHosts.length &&
    !allowedHosts.includes(new URL(context.req.url).hostname)
  ) {
    return context.json({ error: 'invalid_host' }, 403);
  }
  const gate = requireBearerAuth({
    verifier: new SupabaseTokenVerifier(env),
    resourceMetadataUrl: new URL(
      '/.well-known/oauth-protected-resource/mcp',
      env.MCP_RESOURCE_URL
    ).href,
  });
  const auth = await gate(context.req.raw);
  if (auth instanceof Response) return auth;

  const server = createSpendistMcpServer({
    supabaseUrl: env.SUPABASE_URL,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
    accessToken: auth.token,
    clientId: auth.clientId,
  });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    allowedHosts: allowedHosts.length ? allowedHosts : undefined,
    enableDnsRebindingProtection: allowedHosts.length > 0,
  });
  await server.connect(transport);
  try {
    const parsedBody = (
      context as unknown as { get(key: 'parsedBody'): unknown }
    ).get('parsedBody');
    return await transport.handleRequest(context.req.raw, {
      authInfo: auth,
      parsedBody,
    });
  } finally {
    await server.close();
  }
});

export default app;

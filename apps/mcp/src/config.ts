export interface McpEnvironment {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  MCP_RESOURCE_URL: string;
  MCP_ALLOWED_AUDIENCE: string;
  MCP_OAUTH_ISSUER: string;
  MCP_ALLOWED_HOSTS?: string;
}

export function requireEnvironment(
  env: Partial<McpEnvironment>
): McpEnvironment {
  return {
    ...env,
    SUPABASE_URL: requireValue(env.SUPABASE_URL, 'SUPABASE_URL'),
    SUPABASE_PUBLISHABLE_KEY: requireValue(
      env.SUPABASE_PUBLISHABLE_KEY,
      'SUPABASE_PUBLISHABLE_KEY'
    ),
    MCP_RESOURCE_URL: requireValue(env.MCP_RESOURCE_URL, 'MCP_RESOURCE_URL'),
    MCP_ALLOWED_AUDIENCE: requireValue(
      env.MCP_ALLOWED_AUDIENCE,
      'MCP_ALLOWED_AUDIENCE'
    ),
    MCP_OAUTH_ISSUER: requireValue(env.MCP_OAUTH_ISSUER, 'MCP_OAUTH_ISSUER'),
  };
}

function requireValue(value: string | undefined, key: string): string {
  if (!value) throw new Error(`Missing environment variable: ${key}`);

  return value;
}

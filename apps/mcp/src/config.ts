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
  const keys = [
    'SUPABASE_URL',
    'SUPABASE_PUBLISHABLE_KEY',
    'MCP_RESOURCE_URL',
    'MCP_ALLOWED_AUDIENCE',
    'MCP_OAUTH_ISSUER',
  ] as const;
  for (const key of keys)
    if (!env[key]) throw new Error(`Missing environment variable: ${key}`);
  return env as McpEnvironment;
}

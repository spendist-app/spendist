/**
 * Spendist-defined scope that unlocks mutating MCP tools.
 *
 * Supabase Auth only issues the standard scopes `openid`, `email`, `profile`,
 * `phone`, and `offline_access`, so a client cannot request this scope.
 * The user grants it per client on the consent page, and the access-token
 * hook exposes that decision as the `spendist_mcp_write` claim.
 */
export const MCP_WRITE_SCOPE = 'spendist:write';

/**
 * Scopes a client should request from Supabase Auth. `email` is the
 * Supabase default and is enough for read-only MCP access.
 */
export const MCP_REQUESTABLE_SCOPES = ['email'];

export function grantedScopes(
  scope: string | undefined,
  writeGranted: boolean
): string[] {
  const issued = (scope?.split(' ') ?? []).filter(
    (value) => value && value !== MCP_WRITE_SCOPE
  );

  return writeGranted ? [...issued, MCP_WRITE_SCOPE] : issued;
}

export function allowsWrite(scopes: readonly string[]): boolean {
  return scopes.includes(MCP_WRITE_SCOPE);
}

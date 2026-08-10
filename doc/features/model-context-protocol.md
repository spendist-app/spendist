# Model Context Protocol integration

Spendist provides an MCP server for user-authorized personal-finance workflows. It uses the official TypeScript MCP SDK and exposes the same server contract over local STDIO and remote, stateless Streamable HTTP.

## User-visible behavior

- Users can connect a compatible MCP client and approve access through Spendist's OAuth consent page at `/oauth/consent`.
- Users can review and revoke OAuth grants at `/settings/connected-apps`; revocation invalidates the client's refresh-token access.
- Read tools cover the profile, wallets, currencies, category groups, categories, tags, places, transactions, recurring payments, notifications, Allowance state, dashboard summaries, audit metadata, and a portable JSON export.
- Write tools cover the ordinary creation and update flows for wallets, taxonomy, places, transactions, recurring payments, recurring occurrences, notification read state, and default-wallet selection.
- Relationships are always represented by stable UUIDs. Monetary inputs are decimal strings so an MCP host does not silently round user-entered values.
- Deletion is a two-call flow. `prepare_delete` returns the expected effects and a confirmation token that expires after five minutes. `confirm_delete` accepts the token only for the same user and unchanged record and consumes it once.

## Authorization and data ownership

The remote server is an OAuth 2.1 protected resource. Supabase Auth provides authorization-code flow with PKCE, dynamic client registration, consent, refresh tokens, and grant revocation. Access tokens for OAuth clients receive the MCP audience and a `spendist_mcp` claim through the custom access-token hook.

The Cloudflare Worker verifies issuer, audience, expiry, MCP claim, user identity, and the token with Supabase Auth. Every database operation then uses the user's bearer token plus the public publishable key. The server has no service-role key, so existing RLS ownership policies remain authoritative.

STDIO uses a user-supplied access token from `SPENDIST_ACCESS_TOKEN`. It writes protocol messages only to stdout and diagnostics only to stderr.

## Audit and privacy

Every mutation first creates an owner-scoped `mcp_audit_events` row. Audit rows contain the client ID, tool name, target type and ID, request ID, outcome, error code, and timestamps. They never contain tool arguments, descriptions, monetary values, tokens, or export payloads. A mutation does not run if its audit-start record cannot be created.

## Deliberate limits

- MCP does not change passwords, account identity, avatars, or account deletion.
- Allowance is read-only because it affects another person's ledger.
- File imports remain in the browser review workflows.
- Export returns at most 1,000 rows per supported table in one call; larger histories require the existing application export or paginated reads.
- Spendist records and explains personal-finance data. The integration does not initiate payments and does not provide accounting, tax, or investment advice.

## Runtime ownership

- Domain access: `libs/data-access/spendist/`
- MCP registry and STDIO entry: `apps/mcp/src/server.ts` and `apps/mcp/src/main.ts`
- Cloudflare Worker entry: `apps/mcp/src/worker.ts`
- Worker environments: `wrangler.mcp.toml`
- OAuth consent UI: `apps/web/src/app/pages/oauth-consent/`
- Security migration: `supabase/migrations/202608100015_add_mcp_security.sql`

Spendist does not maintain a separate MCP staging Worker at this early product stage. Development uses STDIO, local Supabase, SQL tests, and a Cloudflare production-configuration dry-run. A small invited group then validates OAuth discovery, dynamic registration, consent, token claims, read tools, audited mutations, guarded deletion, and client compatibility directly at `https://mcp.spendist.app/mcp`. Access should be expanded only after that production pilot passes.

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import {
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
  type OAuthTokenVerifier,
} from '@modelcontextprotocol/server';
import type { McpEnvironment } from './config';
import { grantedScopes } from './scopes';

interface TokenClaims {
  aud?: string | string[];
  client_id?: string;
  exp?: number;
  iss?: string;
  scope?: string;
  spendist_mcp?: boolean;
  spendist_mcp_write?: boolean;
  sub?: string;
}

export function decodeClaims(token: string): TokenClaims {
  try {
    const part = token.split('.')[1];

    if (!part) throw new Error();
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/');

    return z
      .object({
        aud: z.union([z.string(), z.array(z.string())]).optional(),
        client_id: z.string().optional(),
        exp: z.number().optional(),
        iss: z.string().optional(),
        scope: z.string().optional(),
        spendist_mcp: z.boolean().optional(),
        spendist_mcp_write: z.boolean().optional(),
        sub: z.string().optional(),
      })
      .parse(JSON.parse(atob(normalized)));
  } catch {
    throw new OAuthError(
      OAuthErrorCode.InvalidToken,
      'Malformed access token.'
    );
  }
}

export class SupabaseTokenVerifier implements OAuthTokenVerifier {
  constructor(private readonly env: McpEnvironment) {}

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const claims = decodeClaims(token);
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];

    if (!claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) {
      throw new OAuthError(
        OAuthErrorCode.InvalidToken,
        'Expired access token.'
      );
    }

    if (claims.iss !== `${this.env.SUPABASE_URL}/auth/v1`) {
      throw new OAuthError(
        OAuthErrorCode.InvalidToken,
        'Unexpected token issuer.'
      );
    }

    if (
      !claims.spendist_mcp ||
      !audience.includes(this.env.MCP_ALLOWED_AUDIENCE)
    ) {
      throw new OAuthError(
        OAuthErrorCode.InvalidToken,
        'Token was not issued for Spendist MCP.'
      );
    }

    const supabase = createClient(
      this.env.SUPABASE_URL,
      this.env.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      }
    );

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user || data.user.id !== claims.sub) {
      throw new OAuthError(
        OAuthErrorCode.InvalidToken,
        'Access token could not be verified.'
      );
    }

    return {
      token,
      clientId: claims.client_id ?? 'unknown-oauth-client',
      scopes: grantedScopes(claims.scope, claims.spendist_mcp_write === true),
      expiresAt: claims.exp,
      resource: new URL(this.env.MCP_RESOURCE_URL),
      extra: { userId: data.user.id },
    };
  }
}

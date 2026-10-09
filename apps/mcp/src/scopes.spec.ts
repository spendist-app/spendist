import { describe, expect, it } from 'vitest';
import { MCP_WRITE_SCOPE, allowsWrite, grantedScopes } from './scopes';

describe('grantedScopes', () => {
  it('keeps issued scopes read-only without the write claim', () => {
    const scopes = grantedScopes('openid  email', false);

    expect(scopes).toEqual(['openid', 'email']);
    expect(allowsWrite(scopes)).toBe(false);
  });

  it('adds the write scope only from the write claim', () => {
    const scopes = grantedScopes('email', true);

    expect(scopes).toEqual(['email', MCP_WRITE_SCOPE]);
    expect(allowsWrite(scopes)).toBe(true);
  });

  it('ignores a write scope that did not come from the write claim', () => {
    expect(allowsWrite(grantedScopes(`email ${MCP_WRITE_SCOPE}`, false))).toBe(
      false
    );
  });

  it('handles a token without a scope claim', () => {
    expect(grantedScopes(undefined, false)).toEqual([]);
  });
});

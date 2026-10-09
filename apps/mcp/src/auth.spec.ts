import { describe, expect, it } from 'vitest';
import { decodeClaims } from './auth';

function token<T>(payload: T): string {
  return `x.${btoa(JSON.stringify(payload)).replace(/=/g, '')}.x`;
}

describe('decodeClaims', () => {
  it('decodes URL-safe JWT claims', () => {
    expect(
      decodeClaims(token({ sub: 'user', spendist_mcp: true }))
    ).toMatchObject({ sub: 'user', spendist_mcp: true });
  });

  it('decodes the Spendist MCP write claim', () => {
    expect(
      decodeClaims(token({ sub: 'user', spendist_mcp_write: true }))
    ).toMatchObject({ spendist_mcp_write: true });
  });

  it('rejects decoded claims with an invalid field type', () => {
    expect(() => decodeClaims(token({ sub: 123 }))).toThrow(
      'Malformed access token'
    );
  });

  it('rejects malformed tokens', () => {
    expect(() => decodeClaims('invalid')).toThrow('Malformed access token');
  });
});

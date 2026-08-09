import { describe, expect, it } from 'vitest';
import { decodeClaims } from './auth';

function token(payload: object): string {
  return `x.${btoa(JSON.stringify(payload)).replace(/=/g, '')}.x`;
}

describe('decodeClaims', () => {
  it('decodes URL-safe JWT claims', () => {
    expect(
      decodeClaims(token({ sub: 'user', spendist_mcp: true }))
    ).toMatchObject({ sub: 'user', spendist_mcp: true });
  });

  it('rejects malformed tokens', () => {
    expect(() => decodeClaims('invalid')).toThrow('Malformed access token');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { readEnv } from './read-env';

const primary = 'SPENDIST_TEST_ENV_PRIMARY';

const alias = 'SPENDIST_TEST_ENV_ALIAS';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('readEnv', () => {
  it('checks all direct aliases before nested runtime values', () => {
    vi.stubGlobal(primary, 123);
    vi.stubGlobal(alias, 'direct-alias');
    vi.stubGlobal('env', { [primary]: 'nested-primary' });

    expect(readEnv([primary, alias])).toBe('direct-alias');
  });

  it('keeps the env then __env source order and skips malformed fields', () => {
    vi.stubGlobal(primary, undefined);
    vi.stubGlobal('env', { [primary]: false });
    vi.stubGlobal('__env', { [primary]: 'legacy-runtime' });

    expect(readEnv([primary])).toBe('legacy-runtime');
  });

  it('accepts process/import-meta values after empty runtime values', () => {
    vi.stubGlobal(primary, '');
    vi.stubGlobal('env', { [primary]: '' });
    vi.stubGlobal('__env', undefined);
    vi.stubEnv(primary, 'build-value');

    expect(readEnv([primary])).toBe('build-value');
  });

  it('returns undefined for absent or non-string values', () => {
    vi.stubGlobal(primary, { nested: 'invalid' });
    vi.stubGlobal('env', null);
    vi.stubGlobal('__env', 42);
    vi.stubEnv(primary, undefined);

    expect(readEnv([primary])).toBeUndefined();
  });
});

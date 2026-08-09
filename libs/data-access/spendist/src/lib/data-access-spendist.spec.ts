import { describe, expect, it } from 'vitest';
import { SpendistDataAccess } from './data-access-spendist';

describe('SpendistDataAccess', () => {
  it('constructs a client without persisting a session', () => {
    const access = new SpendistDataAccess({
      supabaseUrl: 'http://127.0.0.1:54321',
      publishableKey: 'local-test-key',
      accessToken: 'local-test-token',
      clientId: 'test-client',
    });
    expect(access.connection.clientId).toBe('test-client');
  });
});

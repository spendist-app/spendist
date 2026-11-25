import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  SpendistDataAccess,
  type TransactionInput,
} from './data-access-spendist';

const connection = {
  supabaseUrl: 'http://127.0.0.1:54321',
  publishableKey: 'local-test-key',
  accessToken: 'local-test-token',
  clientId: 'test-client',
  userId: '20000000-0000-0000-0000-000000000001',
};

const transaction: TransactionInput = {
  amount: '12.50',
  categoryId: '10000000-0000-0000-0000-000000000001',
  walletId: '10000000-0000-0000-0000-000000000002',
  occurredAt: '2026-11-20T12:00:00+01:00',
  direction: 'expense',
  tagIds: ['10000000-0000-0000-0000-000000000003'],
};

function row(id: string) {
  return {
    id,
    description: null,
    transaction_tags: [{ tag_id: '10000000-0000-0000-0000-000000000003' }],
  };
}

function json(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function stubFetch(...responses: Response[]) {
  const fetch = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
    async () => {
      const response = responses.shift();

      if (!response) throw new Error('Unexpected request.');

      return response;
    }
  );

  vi.stubGlobal('fetch', fetch);

  return fetch;
}

function request(fetch: ReturnType<typeof stubFetch>, index: number) {
  const call = fetch.mock.calls[index];

  if (!call) throw new Error(`Request ${index} was not sent.`);

  const [url, init] = call;

  return {
    url,
    body: z
      .record(z.string(), z.unknown())
      .parse(JSON.parse(String(init.body))),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SpendistDataAccess', () => {
  it('constructs a client without persisting a session', () => {
    const access = new SpendistDataAccess(connection);

    expect(access.connection.clientId).toBe('test-client');
  });

  it('creates 100 transactions with one request', async () => {
    const items = Array.from({ length: 100 }, (_, index) => row(`id-${index}`));
    const fetch = stubFetch(json(JSON.stringify({ items, replayed: false })));
    const access = new SpendistDataAccess(connection);

    const result = await access.createTransactions(
      Array.from({ length: 100 }, () => transaction),
      'retry-key'
    );

    expect(result.items).toHaveLength(100);

    expect(fetch).toHaveBeenCalledTimes(1);

    const { url, body } = request(fetch, 0);

    expect(url).toContain('/rest/v1/rpc/mcp_create_transactions');

    expect(z.array(z.unknown()).parse(body['p_transactions'])).toHaveLength(
      100
    );

    expect(body).toMatchObject({
      p_idempotency_key: 'retry-key',
      p_client_id: 'test-client',
      p_tool_name: 'create_transactions',
    });
  });

  it('rejects batches above 100 transactions before any request', async () => {
    const fetch = stubFetch();
    const access = new SpendistDataAccess(connection);

    await expect(
      access.createTransactions(Array.from({ length: 101 }, () => transaction))
    ).rejects.toThrow('Batch size must be between 1 and 100.');

    expect(fetch).not.toHaveBeenCalled();
  });

  it('records a failed batch once and reports the failing row', async () => {
    const fetch = stubFetch(
      json(
        JSON.stringify({
          code: 'P0001',
          message:
            'Transaction 3: Wallet 10000000-0000-0000-0000-000000000009 was not found.',
        }),
        400
      ),
      new Response(null, { status: 201 })
    );

    const access = new SpendistDataAccess(connection);

    await expect(
      access.createTransactions([transaction, transaction, transaction])
    ).rejects.toThrow('Transaction 3: Wallet');

    expect(fetch).toHaveBeenCalledTimes(2);

    const audit = request(fetch, 1);

    expect(audit.url).toContain('/rest/v1/mcp_audit_events');

    expect(audit.body).toMatchObject({
      tool_name: 'create_transactions',
      outcome: 'failed',
    });
  });
});

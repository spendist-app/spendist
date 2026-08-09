import {
  McpServer,
  ResourceTemplate,
  type CallToolResult,
  type StandardSchemaWithJSON,
} from '@modelcontextprotocol/server';
import { z } from 'zod';
import {
  SpendistDataAccess,
  type DeleteEntity,
  type SpendistConnection,
} from '@spendist/data-access/spendist';
import { toolError, toolResult } from './result';

const Empty = z.object({});
const Id = z.object({ id: z.string().uuid() });
const Page = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
});
const Direction = z.enum(['income', 'expense']);
const OptionalStyle = {
  color: z.string().max(32).nullable().optional(),
  icon: z.string().max(100).nullable().optional(),
};
const Transaction = z.object({
  amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  categoryId: z.string().uuid(),
  walletId: z.string().uuid(),
  occurredAt: z.iso.datetime({ offset: true }),
  direction: Direction,
  description: z.string().max(500).nullable().optional(),
  placeId: z.string().uuid().nullable().optional(),
  tagIds: z.array(z.string().uuid()).max(50).optional(),
});
const Recurring = z.object({
  name: z.string().trim().min(1).max(120),
  amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
  categoryId: z.string().uuid(),
  walletId: z.string().uuid(),
  startDate: z.iso.date(),
  endDate: z.iso.date().nullable().optional(),
  schedule: z.string().trim().min(1).max(120),
  direction: Direction,
  tagIds: z.array(z.string().uuid()).max(50).optional(),
});

function operation<T extends z.ZodRawShape>(
  server: McpServer,
  name: string,
  description: string,
  schema: z.ZodObject<T>,
  handler: (input: z.output<z.ZodObject<T>>) => Promise<unknown>,
  readOnly = true
): void {
  server.registerTool(
    name,
    {
      description,
      inputSchema: schema as StandardSchemaWithJSON,
      annotations: {
        readOnlyHint: readOnly,
        destructiveHint: name === 'confirm_delete',
        idempotentHint: readOnly,
        openWorldHint: false,
      },
    },
    async (input: unknown): Promise<CallToolResult> => {
      try {
        return toolResult(await handler(schema.parse(input)));
      } catch (error) {
        return toolError(error);
      }
    }
  );
}

function jsonResource(uri: URL, value: unknown) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(value),
      },
    ],
  };
}

export function createSpendistMcpServer(
  connection: SpendistConnection
): McpServer {
  const access = new SpendistDataAccess(connection);
  const server = new McpServer(
    { name: 'spendist', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {}, prompts: {} } }
  );

  operation(
    server,
    'get_profile',
    'Read the authenticated Spendist profile.',
    Empty,
    () => access.profile()
  );
  operation(
    server,
    'list_currencies',
    'List supported wallet currencies.',
    Empty,
    () => access.currencies()
  );

  const lists = [
    ['list_wallets', 'wallets'],
    ['list_category_groups', 'categories_group'],
    ['list_categories', 'categories'],
    ['list_tags', 'tags'],
    ['list_places', 'places'],
    ['list_recurring_payments', 'recurring_transactions'],
    ['list_notifications', 'notifications'],
  ] as const;
  for (const [name, table] of lists) {
    operation(
      server,
      name,
      `List the user's ${table.replaceAll('_', ' ')} with cursor pagination.`,
      Page,
      (input) => access.list(table, input)
    );
  }

  operation(
    server,
    'list_transactions',
    'List transactions with optional date, wallet, and direction filters.',
    Page.extend({
      from: z.iso.datetime({ offset: true }).optional(),
      to: z.iso.datetime({ offset: true }).optional(),
      walletId: z.string().uuid().optional(),
      direction: Direction.optional(),
    }),
    (input) => access.listTransactions(input)
  );
  operation(
    server,
    'get_transaction',
    'Read one transaction including tag IDs.',
    Id,
    ({ id }) => access.getTransaction(id)
  );
  operation(
    server,
    'get_recurring_payment',
    'Read one recurring payment and its occurrences.',
    Id,
    ({ id }) => access.getRecurring(id)
  );

  operation(
    server,
    'create_wallet',
    'Create a wallet.',
    z.object({
      name: z.string().trim().min(1).max(120),
      currencyId: z.number().int().positive().optional(),
    }),
    ({ name, currencyId }) =>
      access.create('wallets', { name, currency_id: currencyId }),
    false
  );
  operation(
    server,
    'update_wallet',
    'Update a wallet.',
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(120).optional(),
      currencyId: z.number().int().positive().optional(),
    }),
    ({ id, name, currencyId }) =>
      access.update('wallets', id, { name, currency_id: currencyId }),
    false
  );
  operation(
    server,
    'set_default_wallet',
    'Set the default wallet.',
    Id,
    ({ id }) => access.setDefaultWallet(id),
    false
  );

  operation(
    server,
    'create_category_group',
    'Create a category group.',
    z.object({ name: z.string().trim().min(1).max(120), ...OptionalStyle }),
    (input) => access.create('categories_group', input),
    false
  );
  operation(
    server,
    'update_category_group',
    'Update a category group.',
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(120).optional(),
      ...OptionalStyle,
    }),
    ({ id, ...values }) => access.update('categories_group', id, values),
    false
  );
  operation(
    server,
    'create_category',
    'Create a category using IDs for relationships.',
    z.object({
      name: z.string().trim().min(1).max(120),
      groupId: z.string().uuid(),
      parentId: z.string().uuid().nullable().optional(),
      ...OptionalStyle,
    }),
    ({ groupId, parentId, ...values }) =>
      access.create('categories', {
        ...values,
        group_id: groupId,
        parent_id: parentId,
      }),
    false
  );
  operation(
    server,
    'update_category',
    'Update a category using IDs for relationships.',
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(120).optional(),
      groupId: z.string().uuid().optional(),
      parentId: z.string().uuid().nullable().optional(),
      ...OptionalStyle,
    }),
    ({ id, groupId, parentId, ...values }) =>
      access.update('categories', id, {
        ...values,
        group_id: groupId,
        parent_id: parentId,
      }),
    false
  );
  operation(
    server,
    'create_tag',
    'Create a transaction tag.',
    z.object({ name: z.string().trim().min(1).max(120), ...OptionalStyle }),
    (input) => access.create('tags', input),
    false
  );
  operation(
    server,
    'update_tag',
    'Update a transaction tag.',
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(120).optional(),
      ...OptionalStyle,
    }),
    ({ id, ...values }) => access.update('tags', id, values),
    false
  );
  operation(
    server,
    'create_place',
    'Create a transaction place.',
    z.object({
      name: z.string().trim().min(1).max(120),
      street: z.string().max(160).nullable().optional(),
      city: z.string().max(120).nullable().optional(),
      postalCode: z.string().max(32).nullable().optional(),
      country: z.string().max(120).nullable().optional(),
      note: z.string().max(500).nullable().optional(),
    }),
    ({ postalCode, ...values }) =>
      access.create('places', { ...values, postal_code: postalCode }),
    false
  );
  operation(
    server,
    'update_place',
    'Update a transaction place.',
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(120).optional(),
      street: z.string().max(160).nullable().optional(),
      city: z.string().max(120).nullable().optional(),
      postalCode: z.string().max(32).nullable().optional(),
      country: z.string().max(120).nullable().optional(),
      note: z.string().max(500).nullable().optional(),
    }),
    ({ id, postalCode, ...values }) =>
      access.update('places', id, { ...values, postal_code: postalCode }),
    false
  );

  operation(
    server,
    'create_transaction',
    'Create one transaction. Monetary amounts are decimal strings; relationships are IDs.',
    Transaction,
    (input) => access.createTransaction(input),
    false
  );
  operation(
    server,
    'create_transactions',
    'Create 1 to 100 transactions.',
    z.object({ transactions: z.array(Transaction).min(1).max(100) }),
    ({ transactions }) => access.createTransactions(transactions),
    false
  );
  operation(
    server,
    'update_transaction',
    'Update one transaction.',
    Id.extend({
      changes: Transaction.partial().refine(
        (value) => Object.keys(value).length > 0
      ),
    }),
    ({ id, changes }) => access.updateTransaction(id, changes),
    false
  );

  operation(
    server,
    'create_recurring_payment',
    'Create a recurring income or expense.',
    Recurring,
    (input) => access.createRecurring(input),
    false
  );
  operation(
    server,
    'update_recurring_payment',
    'Update a recurring income or expense.',
    Id.extend({
      changes: Recurring.partial().refine(
        (value) => Object.keys(value).length > 0
      ),
    }),
    ({ id, changes }) => access.updateRecurring(id, changes),
    false
  );
  operation(
    server,
    'pause_recurring_payment',
    'Pause a recurring payment.',
    Id,
    ({ id }) => access.setRecurringPaused(id, true),
    false
  );
  operation(
    server,
    'resume_recurring_payment',
    'Resume a recurring payment.',
    Id,
    ({ id }) => access.setRecurringPaused(id, false),
    false
  );
  operation(
    server,
    'complete_recurring_occurrence',
    'Complete a pending recurring occurrence and create its transaction.',
    z.object({
      occurrenceId: z.string().uuid(),
      amount: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
    }),
    ({ occurrenceId, amount }) =>
      access.completeOccurrence(occurrenceId, amount),
    false
  );

  operation(
    server,
    'summarize_cashflow',
    'Summarize monthly income and expenses.',
    z.object({
      months: z.number().int().min(1).max(120).optional(),
      walletId: z.string().uuid().optional(),
    }),
    (input) => access.summary('cashflow', input)
  );
  operation(
    server,
    'summarize_categories',
    'Summarize expense categories for an optional time range.',
    z.object({
      from: z.iso.datetime({ offset: true }).optional(),
      to: z.iso.datetime({ offset: true }).optional(),
    }),
    (input) => access.summary('category', input)
  );
  operation(
    server,
    'summarize_recurring_payments',
    'Summarize recurring transactions by month.',
    z.object({ walletId: z.string().uuid().optional() }),
    (input) => access.summary('recurring', input)
  );
  operation(
    server,
    'summarize_places',
    'Summarize expenses at places for a wallet and year.',
    z.object({
      walletId: z.string().uuid(),
      year: z.number().int().min(2000).max(2200),
    }),
    (input) => access.summary('place', input)
  );
  operation(
    server,
    'get_allowance',
    'Read Allowance connections and invitations. MCP does not mutate this module.',
    Empty,
    () => access.allowance()
  );
  operation(
    server,
    'mark_notification_read',
    'Mark a notification as read.',
    Id,
    ({ id }) => access.markNotificationRead(id),
    false
  );
  operation(
    server,
    'export_data',
    'Export up to 1000 records per supported table as structured JSON.',
    Empty,
    () => access.exportData()
  );

  operation(
    server,
    'prepare_delete',
    'Describe deletion effects and issue a five-minute, one-use confirmation token. This does not delete data.',
    z.object({
      entityType: z.enum([
        'transaction',
        'wallet',
        'category_group',
        'category',
        'tag',
        'place',
        'recurring_payment',
      ]),
      entityId: z.string().uuid(),
    }),
    ({ entityType, entityId }) =>
      access.prepareDelete(entityType as DeleteEntity, entityId),
    false
  );
  operation(
    server,
    'confirm_delete',
    'Irreversibly delete exactly the unchanged entity covered by a valid confirmation token.',
    z.object({ confirmationToken: z.string().uuid() }),
    ({ confirmationToken }) => access.confirmDelete(confirmationToken),
    false
  );
  operation(
    server,
    'list_mcp_audit_events',
    'List metadata-only MCP mutation audit events.',
    Page,
    (input) => access.auditEvents(input)
  );

  server.registerResource(
    'profile',
    'spendist://profile',
    {
      mimeType: 'application/json',
      description: 'Authenticated Spendist profile.',
    },
    async (uri) => jsonResource(uri, await access.profile())
  );
  server.registerResource(
    'reference-data',
    'spendist://reference',
    {
      mimeType: 'application/json',
      description:
        'Wallets, category groups, categories, tags, places, and currencies.',
    },
    async (uri) =>
      jsonResource(uri, {
        wallets: await access.list('wallets', { limit: 200 }),
        categories: await access.list('categories', { limit: 200 }),
        categoryGroups: await access.list('categories_group', { limit: 200 }),
        tags: await access.list('tags', { limit: 200 }),
        places: await access.list('places', { limit: 200 }),
        currencies: await access.currencies(),
      })
  );
  server.registerResource(
    'allowance',
    'spendist://allowance',
    { mimeType: 'application/json', description: 'Read-only Allowance state.' },
    async (uri) => jsonResource(uri, await access.allowance())
  );
  server.registerResource(
    'transaction',
    new ResourceTemplate('spendist://transactions/{id}', { list: undefined }),
    { mimeType: 'application/json', description: 'A transaction by UUID.' },
    async (uri, variables) =>
      jsonResource(uri, await access.getTransaction(String(variables['id'])))
  );
  server.registerResource(
    'audit-event-page',
    new ResourceTemplate('spendist://audit{?cursor}', { list: undefined }),
    { mimeType: 'application/json', description: 'MCP mutation audit events.' },
    async (uri, variables) =>
      jsonResource(
        uri,
        await access.auditEvents({
          cursor: variables['cursor'] ? String(variables['cursor']) : undefined,
        })
      )
  );

  const prompt = (name: string, description: string, text: string) =>
    server.registerPrompt(name, { description, argsSchema: Empty }, () => ({
      messages: [
        { role: 'user' as const, content: { type: 'text' as const, text } },
      ],
    }));
  prompt(
    'record_transactions',
    'Guide safe recording of one or more transactions.',
    'Use Spendist reference resources to resolve relationship IDs, confirm ambiguous values, then call create_transaction or create_transactions. Never guess IDs or monetary values.'
  );
  prompt(
    'review_month',
    'Review monthly personal cash flow.',
    'Use summarize_cashflow, summarize_categories, and filtered list_transactions. Explain patterns without giving tax or investment advice.'
  );
  prompt(
    'review_recurring_payments',
    'Review recurring income and expenses.',
    'Use list_recurring_payments and summarize_recurring_payments. Identify upcoming, paused, and potentially stale entries; ask before changing anything.'
  );
  prompt(
    'prepare_data_export',
    'Prepare a portable Spendist export.',
    'Call export_data, explain the per-table limit, preserve IDs and timestamps, and never claim this is an accounting or tax export.'
  );

  return server;
}

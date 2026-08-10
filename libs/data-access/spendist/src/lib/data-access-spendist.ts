import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@spendist/data-access/supabase-types';

export type Direction = Database['public']['Enums']['transaction_direction'];
export type DeleteEntity =
  | 'transaction'
  | 'wallet'
  | 'category_group'
  | 'category'
  | 'tag'
  | 'place'
  | 'recurring_payment';

export interface SpendistConnection {
  supabaseUrl: string;
  publishableKey: string;
  accessToken: string;
  clientId: string;
}

export interface PageInput {
  cursor?: string;
  limit?: number;
}

export interface TransactionInput {
  amount: string;
  categoryId: string;
  walletId: string;
  occurredAt: string;
  direction: Direction;
  description?: string | null;
  placeId?: string | null;
  tagIds?: string[];
}

export interface RecurringInput {
  name: string;
  amount: string;
  categoryId: string;
  walletId: string;
  startDate: string;
  schedule: string;
  direction: Direction;
  endDate?: string | null;
  tagIds?: string[];
}

type PublicTables = Database['public']['Tables'];
type TableName = keyof PublicTables;
type TableInsert<T extends TableName> = PublicTables[T]['Insert'];
type TableUpdate<T extends TableName> = PublicTables[T]['Update'];

function assertAmount(value: string): number {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error(
      'Amount must be a non-negative decimal string with at most two decimal places.'
    );
  }
  const amount = Number(value);
  if (!Number.isSafeInteger(Math.round(amount * 100))) {
    throw new Error('Amount is outside the supported range.');
  }
  return amount;
}

function pageOffset(cursor?: string): number {
  if (!cursor) return 0;
  try {
    const value = JSON.parse(
      atob(cursor.replace(/-/g, '+').replace(/_/g, '/'))
    ) as { offset?: unknown };
    if (
      typeof value.offset !== 'number' ||
      value.offset < 0 ||
      !Number.isInteger(value.offset)
    )
      throw new Error();
    return value.offset;
  } catch {
    throw new Error('Invalid cursor.');
  }
}

function nextCursor(offset: number): string {
  return btoa(JSON.stringify({ offset }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');
}

function databaseError(
  error: { message: string; code?: string } | null
): never {
  throw new Error(
    error?.code
      ? `${error.code}: ${error.message}`
      : error?.message ?? 'Database request failed.'
  );
}

export class SpendistDataAccess {
  readonly client: SupabaseClient<Database>;
  private userId?: string;

  constructor(readonly connection: SpendistConnection) {
    this.client = createClient<Database>(
      connection.supabaseUrl,
      connection.publishableKey,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
        global: {
          headers: { Authorization: `Bearer ${connection.accessToken}` },
        },
      }
    );
  }

  async authenticate(): Promise<string> {
    if (this.userId) return this.userId;
    const { data, error } = await this.client.auth.getUser(
      this.connection.accessToken
    );
    if (error || !data.user)
      throw new Error('The access token is invalid or expired.');
    this.userId = data.user.id;
    return this.userId;
  }

  async profile() {
    const ownerId = await this.authenticate();
    const { data, error } = await this.client
      .from('profiles')
      .select(
        'id, username, full_name, language, timezone, created_at, updated_at'
      )
      .eq('id', ownerId)
      .single();
    if (error) databaseError(error);
    return data;
  }

  async currencies() {
    const { data, error } = await this.client
      .from('currencies')
      .select('id, symbol')
      .order('symbol');
    if (error) databaseError(error);
    return data;
  }

  async list<T extends TableName>(table: T, input: PageInput = {}) {
    const ownerId = await this.authenticate();
    const offset = pageOffset(input.cursor);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const { data, error } = await (this.client as unknown as SupabaseClient)
      .from(table)
      .select('*')
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit);
    if (error) databaseError(error);
    const items = data.slice(0, limit);
    return {
      items,
      nextCursor: data.length > limit ? nextCursor(offset + limit) : null,
    };
  }

  async getTransaction(id: string) {
    const ownerId = await this.authenticate();
    const { data, error } = await this.client
      .from('transactions')
      .select('*, transaction_tags(tag_id)')
      .eq('owner_id', ownerId)
      .eq('id', id)
      .single();
    if (error) databaseError(error);
    return data;
  }

  async listTransactions(
    input: PageInput & {
      from?: string;
      to?: string;
      walletId?: string;
      direction?: Direction;
    }
  ) {
    const ownerId = await this.authenticate();
    const offset = pageOffset(input.cursor);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    let query = this.client
      .from('transactions')
      .select('*, transaction_tags(tag_id)')
      .eq('owner_id', ownerId)
      .order('occurred_at', { ascending: false })
      .range(offset, offset + limit);
    if (input.from) query = query.gte('occurred_at', input.from);
    if (input.to) query = query.lte('occurred_at', input.to);
    if (input.walletId) query = query.eq('wallet_id', input.walletId);
    if (input.direction) query = query.eq('direction', input.direction);
    const { data, error } = await query;
    if (error) databaseError(error);
    const items = data.slice(0, limit);
    return {
      items,
      nextCursor: data.length > limit ? nextCursor(offset + limit) : null,
    };
  }

  async create<
    T extends 'wallets' | 'categories_group' | 'categories' | 'tags' | 'places'
  >(table: T, values: Omit<TableInsert<T>, 'owner_id'>) {
    const ownerId = await this.authenticate();
    const payload = { ...values, owner_id: ownerId } as TableInsert<T>;
    return this.mutate(
      `create_${String(table)}`,
      String(table),
      undefined,
      async () => {
        const { data, error } = await (this.client as unknown as SupabaseClient)
          .from(table)
          .insert(payload)
          .select()
          .single();
        if (error) databaseError(error);
        return data;
      }
    );
  }

  async update<
    T extends 'wallets' | 'categories_group' | 'categories' | 'tags' | 'places'
  >(table: T, id: string, values: Omit<TableUpdate<T>, 'id' | 'owner_id'>) {
    const ownerId = await this.authenticate();
    return this.mutate(
      `update_${String(table)}`,
      String(table),
      id,
      async () => {
        const { data, error } = await (this.client as unknown as SupabaseClient)
          .from(table)
          .update(values as TableUpdate<T>)
          .eq('owner_id', ownerId)
          .eq('id', id)
          .select()
          .single();
        if (error) databaseError(error);
        return data;
      }
    );
  }

  async setDefaultWallet(id: string) {
    const ownerId = await this.authenticate();
    return this.mutate('set_default_wallet', 'wallet', id, async () => {
      const { error: targetError } = await this.client
        .from('wallets')
        .select('id')
        .eq('owner_id', ownerId)
        .eq('id', id)
        .single();
      if (targetError) databaseError(targetError);
      const { error: clearError } = await this.client
        .from('wallets')
        .update({ is_default: false })
        .eq('owner_id', ownerId);
      if (clearError) databaseError(clearError);
      const { data, error } = await this.client
        .from('wallets')
        .update({ is_default: true })
        .eq('owner_id', ownerId)
        .eq('id', id)
        .select()
        .single();
      if (error) databaseError(error);
      return data;
    });
  }

  private async walletCurrency(walletId: string): Promise<string> {
    const ownerId = await this.authenticate();
    const { data, error } = await this.client
      .from('wallets')
      .select('currencies(symbol)')
      .eq('owner_id', ownerId)
      .eq('id', walletId)
      .single();
    if (error) databaseError(error);
    const relation = data.currencies as unknown as { symbol: string } | null;
    if (!relation?.symbol)
      throw new Error('Wallet currency could not be resolved.');
    return relation.symbol;
  }

  async createTransaction(input: TransactionInput) {
    const ownerId = await this.authenticate();
    const amount = assertAmount(input.amount);
    const currency = await this.walletCurrency(input.walletId);
    return this.mutate(
      'create_transaction',
      'transaction',
      undefined,
      async () => {
        const { tagIds = [], ...rest } = input;
        const payload: PublicTables['transactions']['Insert'] = {
          amount,
          amount_in_default: amount,
          category_id: rest.categoryId,
          currency,
          description: rest.description ?? null,
          direction: rest.direction,
          occurred_at: rest.occurredAt,
          owner_id: ownerId,
          place_id: rest.placeId ?? null,
          wallet_id: rest.walletId,
        };
        const { data, error } = await this.client
          .from('transactions')
          .insert(payload)
          .select()
          .single();
        if (error) databaseError(error);
        if (tagIds.length) {
          const rows = [...new Set(tagIds)].map((tagId) => ({
            owner_id: ownerId,
            transaction_id: data.id,
            tag_id: tagId,
          }));
          const { error: tagError } = await this.client
            .from('transaction_tags')
            .insert(rows);
          if (tagError) databaseError(tagError);
        }
        return data;
      }
    );
  }

  async createTransactions(inputs: TransactionInput[]) {
    if (inputs.length < 1 || inputs.length > 100)
      throw new Error('Batch size must be between 1 and 100.');
    const items = [];
    for (const input of inputs) items.push(await this.createTransaction(input));
    return { items };
  }

  async updateTransaction(id: string, input: Partial<TransactionInput>) {
    const ownerId = await this.authenticate();
    return this.mutate('update_transaction', 'transaction', id, async () => {
      const { tagIds, ...values } = input;
      const payload: PublicTables['transactions']['Update'] = {};
      if (values.amount !== undefined) {
        payload.amount = assertAmount(values.amount);
        payload.amount_in_default = payload.amount;
      }
      if (values.categoryId !== undefined)
        payload.category_id = values.categoryId;
      if (values.walletId !== undefined) {
        payload.wallet_id = values.walletId;
        payload.currency = await this.walletCurrency(values.walletId);
      }
      if (values.occurredAt !== undefined)
        payload.occurred_at = values.occurredAt;
      if (values.direction !== undefined) payload.direction = values.direction;
      if (values.description !== undefined)
        payload.description = values.description;
      if (values.placeId !== undefined) payload.place_id = values.placeId;
      const { data, error } = await this.client
        .from('transactions')
        .update(payload)
        .eq('owner_id', ownerId)
        .eq('id', id)
        .select()
        .single();
      if (error) databaseError(error);
      if (tagIds) {
        const { error: clearError } = await this.client
          .from('transaction_tags')
          .delete()
          .eq('owner_id', ownerId)
          .eq('transaction_id', id);
        if (clearError) databaseError(clearError);
        if (tagIds.length) {
          const rows = [...new Set(tagIds)].map((tagId) => ({
            owner_id: ownerId,
            transaction_id: id,
            tag_id: tagId,
          }));
          const { error: tagError } = await this.client
            .from('transaction_tags')
            .insert(rows);
          if (tagError) databaseError(tagError);
        }
      }
      return data;
    });
  }

  async getRecurring(id: string) {
    const ownerId = await this.authenticate();
    const { data, error } = await this.client
      .from('recurring_transactions')
      .select(
        '*, recurring_transaction_tags(tag_id), recurring_transaction_occurrences(*)'
      )
      .eq('owner_id', ownerId)
      .eq('id', id)
      .single();
    if (error) databaseError(error);
    return data;
  }

  async createRecurring(input: RecurringInput) {
    const ownerId = await this.authenticate();
    const currency = await this.walletCurrency(input.walletId);
    return this.mutate(
      'create_recurring_payment',
      'recurring_payment',
      undefined,
      async () => {
        const { data, error } = await this.client
          .from('recurring_transactions')
          .insert({
            amount: assertAmount(input.amount),
            category_id: input.categoryId,
            currency,
            direction: input.direction,
            end_date: input.endDate ?? null,
            name: input.name,
            owner_id: ownerId,
            schedule: input.schedule,
            start_date: input.startDate,
            wallet_id: input.walletId,
          })
          .select()
          .single();
        if (error) databaseError(error);
        if (input.tagIds?.length) {
          const rows = [...new Set(input.tagIds)].map((tagId) => ({
            owner_id: ownerId,
            recurring_transaction_id: data.id,
            tag_id: tagId,
          }));
          const { error: tagError } = await this.client
            .from('recurring_transaction_tags')
            .insert(rows);
          if (tagError) databaseError(tagError);
        }
        return data;
      }
    );
  }

  async updateRecurring(id: string, input: Partial<RecurringInput>) {
    const ownerId = await this.authenticate();
    return this.mutate(
      'update_recurring_payment',
      'recurring_payment',
      id,
      async () => {
        const { tagIds, ...values } = input;
        const payload: PublicTables['recurring_transactions']['Update'] = {};
        if (values.amount !== undefined)
          payload.amount = assertAmount(values.amount);
        if (values.categoryId !== undefined)
          payload.category_id = values.categoryId;
        if (values.walletId !== undefined) {
          payload.wallet_id = values.walletId;
          payload.currency = await this.walletCurrency(values.walletId);
        }
        if (values.name !== undefined) payload.name = values.name;
        if (values.startDate !== undefined)
          payload.start_date = values.startDate;
        if (values.endDate !== undefined) payload.end_date = values.endDate;
        if (values.schedule !== undefined) payload.schedule = values.schedule;
        if (values.direction !== undefined)
          payload.direction = values.direction;
        const { data, error } = await this.client
          .from('recurring_transactions')
          .update(payload)
          .eq('owner_id', ownerId)
          .eq('id', id)
          .select()
          .single();
        if (error) databaseError(error);
        if (tagIds) {
          const { error: clearError } = await this.client
            .from('recurring_transaction_tags')
            .delete()
            .eq('owner_id', ownerId)
            .eq('recurring_transaction_id', id);
          if (clearError) databaseError(clearError);
          if (tagIds.length) {
            const rows = [...new Set(tagIds)].map((tagId) => ({
              owner_id: ownerId,
              recurring_transaction_id: id,
              tag_id: tagId,
            }));
            const { error: tagError } = await this.client
              .from('recurring_transaction_tags')
              .insert(rows);
            if (tagError) databaseError(tagError);
          }
        }
        return data;
      }
    );
  }

  async setRecurringPaused(id: string, paused: boolean) {
    return this.updateRecurringState(
      id,
      paused ? 'pause_recurring_payment' : 'resume_recurring_payment',
      {
        is_paused: paused,
        paused_at: paused ? new Date().toISOString() : null,
      }
    );
  }

  private async updateRecurringState(
    id: string,
    tool: string,
    values: PublicTables['recurring_transactions']['Update']
  ) {
    const ownerId = await this.authenticate();
    return this.mutate(tool, 'recurring_payment', id, async () => {
      const { data, error } = await this.client
        .from('recurring_transactions')
        .update(values)
        .eq('owner_id', ownerId)
        .eq('id', id)
        .select()
        .single();
      if (error) databaseError(error);
      return data;
    });
  }

  async completeOccurrence(occurrenceId: string, amount: string) {
    return this.mutate(
      'complete_recurring_occurrence',
      'recurring_occurrence',
      occurrenceId,
      async () => {
        const { data, error } = await this.client.rpc(
          'complete_standard_recurring_transaction_occurrence',
          {
            p_amount: assertAmount(amount),
            p_occurrence_id: occurrenceId,
          }
        );
        if (error) databaseError(error);
        return { transactionId: data };
      }
    );
  }

  async summary(
    kind: 'cashflow' | 'category' | 'recurring' | 'place',
    input: Record<string, unknown>
  ) {
    await this.authenticate();
    if (kind === 'cashflow') {
      const { data, error } = await this.client.rpc(
        'monthly_cashflow_summary',
        {
          p_months: Number(input['months'] ?? 12),
          p_wallet_id: input['walletId'] as string | undefined,
        }
      );
      if (error) databaseError(error);
      return data;
    }
    if (kind === 'category') {
      const { data, error } = await this.client.rpc(
        'category_expense_summary',
        {
          p_from: input['from'] as string | undefined,
          p_to: input['to'] as string | undefined,
        }
      );
      if (error) databaseError(error);
      return data;
    }
    if (kind === 'recurring') {
      const { data, error } = await this.client.rpc(
        'monthly_recurring_transaction_summary',
        { p_wallet_id: input['walletId'] as string | undefined }
      );
      if (error) databaseError(error);
      return data;
    }
    const { data, error } = await this.client.rpc('place_expense_summary', {
      p_wallet_id: String(input['walletId']),
      p_year: Number(input['year']),
    });
    if (error) databaseError(error);
    return data;
  }

  async allowance() {
    const ownerId = await this.authenticate();
    const [connections, invitations] = await Promise.all([
      this.client.rpc('get_allowance_connections'),
      this.client
        .from('allowance_invitations')
        .select(
          'id, inviter_id, invitee_id, invitee_email, status, expires_at, created_at'
        )
        .or(`inviter_id.eq.${ownerId},invitee_id.eq.${ownerId}`)
        .order('created_at', { ascending: false }),
    ]);
    if (connections.error) databaseError(connections.error);
    if (invitations.error) databaseError(invitations.error);
    return { connections: connections.data, invitations: invitations.data };
  }

  async markNotificationRead(id: string) {
    const ownerId = await this.authenticate();
    return this.mutate(
      'mark_notification_read',
      'notification',
      id,
      async () => {
        const { data, error } = await this.client
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('owner_id', ownerId)
          .eq('id', id)
          .select()
          .single();
        if (error) databaseError(error);
        return data;
      }
    );
  }

  async exportData() {
    const ownerId = await this.authenticate();
    const tables = [
      'wallets',
      'categories_group',
      'categories',
      'tags',
      'places',
      'transactions',
      'transaction_tags',
      'recurring_transactions',
      'recurring_transaction_tags',
      'recurring_transaction_occurrences',
    ] as const;
    const result: Record<string, unknown> = {};
    for (const table of tables) {
      const { data, error } = await this.client
        .from(table)
        .select('*')
        .eq('owner_id', ownerId)
        .limit(1000);
      if (error) databaseError(error);
      result[table] = data;
    }
    return {
      exportedAt: new Date().toISOString(),
      limitPerTable: 1000,
      data: result,
    };
  }

  async prepareDelete(entityType: DeleteEntity, entityId: string) {
    const ownerId = await this.authenticate();
    const table = (
      {
        transaction: 'transactions',
        wallet: 'wallets',
        category_group: 'categories_group',
        category: 'categories',
        tag: 'tags',
        place: 'places',
        recurring_payment: 'recurring_transactions',
      } as const
    )[entityType];
    const { data: target, error: targetError } = await this.client
      .from(table)
      .select('id, updated_at')
      .eq('owner_id', ownerId)
      .eq('id', entityId)
      .single();
    if (targetError) databaseError(targetError);
    const effects = await this.deleteEffects(entityType, entityId);
    return this.mutate('prepare_delete', entityType, entityId, async () => {
      const client = this.client as unknown as SupabaseClient;
      const { data, error } = await client
        .from('mcp_delete_confirmations')
        .insert({
          owner_id: ownerId,
          entity_type: entityType,
          entity_id: entityId,
          entity_updated_at: target.updated_at,
          effects,
        })
        .select('token, expires_at, effects')
        .single();
      if (error) databaseError(error);
      return data;
    });
  }

  private async deleteEffects(
    entityType: DeleteEntity,
    entityId: string
  ): Promise<Json> {
    const ownerId = await this.authenticate();
    const effects: Record<string, number> = {};
    if (
      entityType === 'wallet' ||
      entityType === 'category' ||
      entityType === 'place'
    ) {
      const column =
        entityType === 'wallet'
          ? 'wallet_id'
          : entityType === 'category'
          ? 'category_id'
          : 'place_id';
      const { count } = await this.client
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', ownerId)
        .eq(column, entityId);
      effects['transactions'] = count ?? 0;
    }
    if (entityType === 'tag') {
      const { count } = await this.client
        .from('transaction_tags')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', ownerId)
        .eq('tag_id', entityId);
      effects['transactionTags'] = count ?? 0;
    }
    return effects;
  }

  async confirmDelete(token: string) {
    const client = this.client as unknown as SupabaseClient;
    return this.mutate(
      'confirm_delete',
      'delete_confirmation',
      token,
      async () => {
        const { data, error } = await client.rpc('confirm_mcp_delete', {
          p_token: token,
        });
        if (error) databaseError(error);
        return data;
      }
    );
  }

  async auditEvents(input: PageInput = {}) {
    const ownerId = await this.authenticate();
    const offset = pageOffset(input.cursor);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const client = this.client as unknown as SupabaseClient;
    const { data, error } = await client
      .from('mcp_audit_events')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit);
    if (error) databaseError(error);
    const items = data.slice(0, limit);
    return {
      items,
      nextCursor: data.length > limit ? nextCursor(offset + limit) : null,
    };
  }

  private async mutate<T>(
    toolName: string,
    targetType: string,
    targetId: string | undefined,
    action: () => Promise<T>
  ): Promise<T> {
    const ownerId = await this.authenticate();
    const requestId = crypto.randomUUID();
    const client = this.client as unknown as SupabaseClient;
    const { data: audit, error: auditError } = await client
      .from('mcp_audit_events')
      .insert({
        owner_id: ownerId,
        client_id: this.connection.clientId,
        tool_name: toolName,
        target_type: targetType,
        target_id: targetId ?? null,
        request_id: requestId,
      })
      .select('id')
      .single();
    if (auditError) databaseError(auditError);
    try {
      const result = await action();
      await client
        .from('mcp_audit_events')
        .update({ outcome: 'succeeded', finished_at: new Date().toISOString() })
        .eq('id', audit.id);
      return result;
    } catch (error) {
      await client
        .from('mcp_audit_events')
        .update({
          outcome: 'failed',
          error_code:
            error instanceof Error ? error.message.slice(0, 120) : 'unknown',
          finished_at: new Date().toISOString(),
        })
        .eq('id', audit.id);
      throw error;
    }
  }
}

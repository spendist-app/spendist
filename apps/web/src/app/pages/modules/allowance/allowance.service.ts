import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  AllowanceInvitationRow,
  Tables,
} from '@spendist/data-access/supabase-types';
import { AuthService } from '../../../core/auth.service';
import { LanguageService } from '../../../core/language.service';
import { logError } from '../../../core/logger';
import { SUPABASE_CLIENT } from '../../../core/supabase';

export interface AllowanceConnection {
  readonly id: string;
  readonly role: 'payer' | 'recipient';
  readonly counterpartId: string;
  readonly counterpartName: string;
  readonly counterpartEmail: string;
  readonly status: 'active' | 'disconnected';
  readonly connectedAt: Date;
}

export interface AllowanceSchedule {
  readonly id: string;
  readonly connectionId: string;
  readonly name: string;
  readonly amount: number;
  readonly amountMode: 'fixed' | 'variable';
  readonly currency: string;
  readonly schedule: string;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly isPaused: boolean;
}

export interface CreateAllowanceSchedulePayload {
  readonly connectionId: string;
  readonly name: string;
  readonly amount: number;
  readonly amountMode: 'fixed' | 'variable';
  readonly currency: string;
  readonly schedule: string;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly categoryId: string;
  readonly walletId: string;
}

export interface AllowanceRecipientExpense {
  readonly transactionId: string;
  readonly connectionId: string;
  readonly recipientName: string;
  readonly occurredAt: Date;
  readonly description: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UpdateAllowanceRecipientExpensePayload {
  readonly occurredAt: Date;
  readonly description: string | null;
  readonly amount: number;
  readonly currency: string;
}

type RecurringRow = Tables<'recurring_transactions'>;

interface AllowanceState {
  readonly loading: boolean;
  readonly pending: boolean;
  readonly error: string | null;
  readonly connections: readonly AllowanceConnection[];
  readonly invitations: readonly AllowanceInvitationRow[];
  readonly schedules: readonly AllowanceSchedule[];
  readonly recipientExpenses: readonly AllowanceRecipientExpense[];
}

interface AllowanceConnectionRpcRow {
  readonly id: string | null;
  readonly role: string | null;
  readonly counterpart_id: string | null;
  readonly counterpart_name: string | null;
  readonly counterpart_email: string | null;
  readonly status: string | null;
  readonly connected_at: string | null;
}

interface AllowanceRecipientExpenseRpcRow {
  readonly transaction_id: string | null;
  readonly connection_id: string | null;
  readonly recipient_name: string | null;
  readonly occurred_at: string | null;
  readonly description: string | null;
  readonly amount: number | string | null;
  readonly currency: string | null;
  readonly created_at: string | null;
  readonly updated_at: string | null;
}

@Injectable()
export class AllowanceService {
  private readonly supabase = inject(SUPABASE_CLIENT, { optional: true });
  private readonly auth = inject(AuthService);
  private readonly language = inject(LanguageService);
  private readonly state = signal<AllowanceState>({
    loading: false,
    pending: false,
    error: null,
    connections: [],
    invitations: [],
    schedules: [],
    recipientExpenses: [],
  });

  readonly loading = computed(() => this.state().loading);
  readonly pending = computed(() => this.state().pending);
  readonly error = computed(() => this.state().error);
  readonly connections = computed(() => this.state().connections);
  readonly invitations = computed(() => this.state().invitations);
  readonly schedules = computed(() => this.state().schedules);
  readonly recipientExpenses = computed(() => this.state().recipientExpenses);
  readonly activePayerConnections = computed(() =>
    this.connections().filter(
      (connection) =>
        connection.role === 'payer' && connection.status === 'active'
    )
  );

  async load(): Promise<void> {
    const userId = this.auth.session()?.user.id;
    if (!userId || !this.supabase) {
      return;
    }
    this.state.update((state) => ({ ...state, loading: true, error: null }));
    try {
      const [
        connectionsResult,
        invitationsResult,
        schedulesResult,
        recipientExpensesResult,
      ] = await Promise.all([
        this.client.rpc('get_allowance_connections'),
        this.client
          .from('allowance_invitations')
          .select('*')
          .order('created_at', { ascending: false }),
        this.client
          .from('recurring_transactions')
          .select('*')
          .eq('source_module', 'allowance')
          .order('creation_date', { ascending: false }),
        this.client.rpc('get_allowance_recipient_expenses'),
      ]);
      if (connectionsResult.error) throw connectionsResult.error;
      if (invitationsResult.error) throw invitationsResult.error;
      if (schedulesResult.error) throw schedulesResult.error;
      if (recipientExpensesResult.error) throw recipientExpensesResult.error;

      this.state.update((state) => ({
        ...state,
        loading: false,
        connections: (
          (connectionsResult.data ?? []) as AllowanceConnectionRpcRow[]
        ).map((row) => ({
          id: row.id ?? '',
          role: row.role === 'recipient' ? 'recipient' : 'payer',
          counterpartId: row.counterpart_id ?? '',
          counterpartName: row.counterpart_name ?? '',
          counterpartEmail: row.counterpart_email ?? '',
          status: row.status === 'disconnected' ? 'disconnected' : 'active',
          connectedAt: new Date(row.connected_at ?? Date.now()),
        })),
        invitations:
          (invitationsResult.data as AllowanceInvitationRow[] | null) ?? [],
        schedules: ((schedulesResult.data ?? []) as RecurringRow[]).map(
          (row) => ({
            id: row.id,
            connectionId: row.allowance_connection_id ?? '',
            name: row.name,
            amount: Number(row.amount),
            amountMode: row.amount_mode === 'variable' ? 'variable' : 'fixed',
            currency: row.currency,
            schedule: row.schedule,
            startDate: row.start_date,
            endDate: row.end_date,
            isPaused: row.is_paused,
          })
        ),
        recipientExpenses: (
          (recipientExpensesResult.data ??
            []) as AllowanceRecipientExpenseRpcRow[]
        ).map((row) => ({
          transactionId: row.transaction_id ?? '',
          connectionId: row.connection_id ?? '',
          recipientName: row.recipient_name ?? '',
          occurredAt: new Date(row.occurred_at ?? Date.now()),
          description: row.description,
          amount: Number(row.amount ?? 0),
          currency: row.currency ?? '',
          createdAt: new Date(row.created_at ?? Date.now()),
          updatedAt: new Date(row.updated_at ?? Date.now()),
        })),
      }));
    } catch (error) {
      logError('AllowanceService', 'Failed to load allowance data', error);
      this.state.update((state) => ({
        ...state,
        loading: false,
        error: 'modules.allowance.errors.load',
      }));
    }
  }

  async invite(email: string): Promise<boolean> {
    return this.mutate(async () => {
      const { error } = await this.client.functions.invoke(
        'send-allowance-invitation',
        {
          body: {
            email,
            language: this.language.currentLanguage(),
          },
        }
      );
      if (error) throw error;
    });
  }

  async respond(invitationId: string, accept: boolean): Promise<boolean> {
    return this.mutate(async () => {
      const { error } = await this.client.rpc(
        'respond_allowance_invitation',
        {
          p_invitation_id: invitationId,
          p_accept: accept,
        }
      );
      if (error) throw error;
    });
  }

  async acceptToken(token: string): Promise<boolean> {
    return this.mutate(async () => {
      const { error } = await this.client.rpc(
        'accept_allowance_invitation',
        { p_token: token }
      );
      if (error) throw error;
    });
  }

  async disconnect(connectionId: string): Promise<boolean> {
    return this.mutate(async () => {
      const { error } = await this.client.rpc(
        'disconnect_allowance_connection',
        { p_connection_id: connectionId }
      );
      if (error) throw error;
    });
  }

  async createSchedule(
    payload: CreateAllowanceSchedulePayload
  ): Promise<boolean> {
    const userId = this.auth.session()?.user.id;
    if (!userId) return false;
    return this.mutate(async () => {
      const { error } = await this.client
        .from('recurring_transactions')
        .insert({
          owner_id: userId,
          allowance_connection_id: payload.connectionId,
          source_module: 'allowance',
          name: payload.name.trim(),
          amount: payload.amountMode === 'variable' ? 0 : payload.amount,
          amount_mode: payload.amountMode,
          currency: payload.currency.toUpperCase(),
          schedule: payload.schedule,
          start_date: payload.startDate,
          end_date: payload.endDate,
          category_id: payload.categoryId,
          wallet_id: payload.walletId,
          direction: 'expense',
          exchange_rate: null,
        });
      if (error) throw error;
    });
  }

  async toggleSchedule(schedule: AllowanceSchedule): Promise<boolean> {
    return this.mutate(async () => {
      const { error } = await this.client
        .from('recurring_transactions')
        .update({
          is_paused: !schedule.isPaused,
          paused_at: schedule.isPaused ? null : new Date().toISOString(),
          last_run_at: schedule.isPaused ? new Date().toISOString() : undefined,
        })
        .eq('id', schedule.id)
        .eq('source_module', 'allowance');
      if (error) throw error;
    });
  }

  async deleteSchedule(scheduleId: string): Promise<boolean> {
    return this.mutate(async () => {
      const { error } = await this.client
        .from('recurring_transactions')
        .delete()
        .eq('id', scheduleId)
        .eq('source_module', 'allowance');
      if (error) throw error;
    });
  }

  async updateRecipientExpense(
    transactionId: string,
    payload: UpdateAllowanceRecipientExpensePayload
  ): Promise<boolean> {
    return this.mutate(async () => {
      const { error } = await this.client.rpc(
        'update_allowance_recipient_expense',
        {
          p_transaction_id: transactionId,
          p_occurred_at: payload.occurredAt.toISOString(),
          p_description: payload.description,
          p_amount: payload.amount,
          p_currency: payload.currency.trim().toUpperCase(),
        }
      );
      if (error) throw error;
    });
  }

  async deleteRecipientExpense(transactionId: string): Promise<boolean> {
    return this.mutate(async () => {
      const { error } = await this.client.rpc(
        'delete_allowance_recipient_expense',
        { p_transaction_id: transactionId }
      );
      if (error) throw error;
    });
  }

  private async mutate(operation: () => Promise<void>): Promise<boolean> {
    if (this.pending()) return false;
    this.state.update((state) => ({ ...state, pending: true, error: null }));
    try {
      await operation();
      this.state.update((state) => ({ ...state, pending: false }));
      await this.load();
      return true;
    } catch (error) {
      logError('AllowanceService', 'Allowance mutation failed', error);
      this.state.update((state) => ({
        ...state,
        pending: false,
        error: 'modules.allowance.errors.mutation',
      }));
      return false;
    }
  }

  private get client() {
    if (!this.supabase) {
      throw new Error('Supabase client is unavailable.');
    }
    return this.supabase;
  }
}

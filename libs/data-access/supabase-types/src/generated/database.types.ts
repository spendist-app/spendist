/**
 * This file is auto-generated via Supabase CLI.
 * Run `npm run db:types:local` to refresh the types.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      allowance_connections: {
        Row: {
          accepted_invitation_id: string | null
          connected_at: string
          created_at: string
          disconnected_at: string | null
          id: string
          payer_id: string
          recipient_category_id: string
          recipient_expense_category_id: string
          recipient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_invitation_id?: string | null
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          id?: string
          payer_id: string
          recipient_category_id: string
          recipient_expense_category_id: string
          recipient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_invitation_id?: string | null
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          id?: string
          payer_id?: string
          recipient_category_id?: string
          recipient_expense_category_id?: string
          recipient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allowance_connections_accepted_invitation_id_fkey"
            columns: ["accepted_invitation_id"]
            isOneToOne: false
            referencedRelation: "allowance_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allowance_connections_category_fk"
            columns: ["recipient_id", "recipient_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["owner_id", "id"]
          },
          {
            foreignKeyName: "allowance_connections_expense_category_fk"
            columns: ["recipient_id", "recipient_expense_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["owner_id", "id"]
          },
          {
            foreignKeyName: "allowance_connections_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allowance_connections_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "allowance_connections_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allowance_connections_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      allowance_delegated_expenses: {
        Row: {
          connection_id: string
          created_at: string
          transaction_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          transaction_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "allowance_delegated_expenses_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "allowance_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allowance_delegated_expenses_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      allowance_invitations: {
        Row: {
          created_at: string
          email_delivery_status: string
          expires_at: string
          id: string
          invitee_email: string
          invitee_id: string | null
          inviter_id: string
          responded_at: string | null
          status: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_delivery_status?: string
          expires_at: string
          id?: string
          invitee_email: string
          invitee_id?: string | null
          inviter_id: string
          responded_at?: string | null
          status?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_delivery_status?: string
          expires_at?: string
          id?: string
          invitee_email?: string
          invitee_id?: string | null
          inviter_id?: string
          responded_at?: string | null
          status?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allowance_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allowance_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "allowance_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allowance_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          creation_date: string
          group_id: string
          icon: string | null
          id: string
          name: string
          owner_id: string
          parent_id: string | null
          system_key: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          creation_date?: string
          group_id: string
          icon?: string | null
          id?: string
          name: string
          owner_id: string
          parent_id?: string | null
          system_key?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          creation_date?: string
          group_id?: string
          icon?: string | null
          id?: string
          name?: string
          owner_id?: string
          parent_id?: string | null
          system_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_group_fk"
            columns: ["owner_id", "group_id"]
            isOneToOne: false
            referencedRelation: "categories_group"
            referencedColumns: ["owner_id", "id"]
          },
          {
            foreignKeyName: "categories_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "categories_parent_fk"
            columns: ["owner_id", "parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      categories_group: {
        Row: {
          color: string | null
          creation_date: string
          icon: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          creation_date?: string
          icon?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          creation_date?: string
          icon?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_group_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_group_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      currencies: {
        Row: {
          creation_date: string
          id: number
          symbol: string
          updated_at: string
        }
        Insert: {
          creation_date?: string
          id: number
          symbol: string
          updated_at?: string
        }
        Update: {
          creation_date?: string
          id?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      exchange_rate_sync_runs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          inserted_count: number
          payload: Json
          range_end: string
          range_start: string
          started_at: string
          status: string
          updated_count: number
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          inserted_count?: number
          payload?: Json
          range_end: string
          range_start: string
          started_at?: string
          status: string
          updated_count?: number
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          inserted_count?: number
          payload?: Json
          range_end?: string
          range_start?: string
          started_at?: string
          status?: string
          updated_count?: number
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          currency: string
          fetched_at: string
          rate: number
          rate_date: string
          source: string
          source_no: string | null
        }
        Insert: {
          currency: string
          fetched_at?: string
          rate: number
          rate_date: string
          source?: string
          source_no?: string | null
        }
        Update: {
          currency?: string
          fetched_at?: string
          rate?: number
          rate_date?: string
          source?: string
          source_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["symbol"]
          },
        ]
      }
      mcp_audit_events: {
        Row: {
          client_id: string
          created_at: string
          error_code: string | null
          finished_at: string | null
          id: string
          outcome: string
          owner_id: string
          request_id: string
          target_id: string | null
          target_type: string | null
          tool_name: string
        }
        Insert: {
          client_id?: string
          created_at?: string
          error_code?: string | null
          finished_at?: string | null
          id?: string
          outcome?: string
          owner_id: string
          request_id: string
          target_id?: string | null
          target_type?: string | null
          tool_name: string
        }
        Update: {
          client_id?: string
          created_at?: string
          error_code?: string | null
          finished_at?: string | null
          id?: string
          outcome?: string
          owner_id?: string
          request_id?: string
          target_id?: string | null
          target_type?: string | null
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_audit_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_audit_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      mcp_delete_confirmations: {
        Row: {
          created_at: string
          effects: Json
          entity_id: string
          entity_type: string
          entity_updated_at: string
          expires_at: string
          owner_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          effects?: Json
          entity_id: string
          entity_type: string
          entity_updated_at: string
          expires_at?: string
          owner_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          effects?: Json
          entity_id?: string
          entity_type?: string
          entity_updated_at?: string
          expires_at?: string
          owner_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_delete_confirmations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcp_delete_confirmations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      mortgage_holidays: {
        Row: {
          ends_on: string
          id: string
          mortgage_id: string
          owner_id: string
          starts_on: string
        }
        Insert: {
          ends_on: string
          id?: string
          mortgage_id: string
          owner_id: string
          starts_on: string
        }
        Update: {
          ends_on?: string
          id?: string
          mortgage_id?: string
          owner_id?: string
          starts_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortgage_holiday_mortgage_fk"
            columns: ["owner_id", "mortgage_id"]
            isOneToOne: false
            referencedRelation: "mortgage_loans"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      mortgage_loans: {
        Row: {
          category_id: string
          created_at: string
          currency: string
          disbursed_on: string
          first_installment_on: string
          id: string
          installment_type: string
          margin: number
          name: string
          owner_id: string
          principal: number
          revision: number
          term_months: number
          transactions_attached: boolean
          updated_at: string
          upfront_cost: number
          wallet_id: string
          wibor_tenor: string
        }
        Insert: {
          category_id: string
          created_at?: string
          currency?: string
          disbursed_on: string
          first_installment_on: string
          id?: string
          installment_type: string
          margin?: number
          name: string
          owner_id: string
          principal: number
          revision?: number
          term_months: number
          transactions_attached?: boolean
          updated_at?: string
          upfront_cost?: number
          wallet_id: string
          wibor_tenor: string
        }
        Update: {
          category_id?: string
          created_at?: string
          currency?: string
          disbursed_on?: string
          first_installment_on?: string
          id?: string
          installment_type?: string
          margin?: number
          name?: string
          owner_id?: string
          principal?: number
          revision?: number
          term_months?: number
          transactions_attached?: boolean
          updated_at?: string
          upfront_cost?: number
          wallet_id?: string
          wibor_tenor?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortgage_category_owner_fk"
            columns: ["owner_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["owner_id", "id"]
          },
          {
            foreignKeyName: "mortgage_loans_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mortgage_loans_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "mortgage_wallet_owner_fk"
            columns: ["owner_id", "wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      mortgage_overpayments: {
        Row: {
          amount: number
          id: string
          mortgage_id: string
          occurs_on: string
          owner_id: string
          strategy: string
        }
        Insert: {
          amount: number
          id?: string
          mortgage_id: string
          occurs_on: string
          owner_id: string
          strategy: string
        }
        Update: {
          amount?: number
          id?: string
          mortgage_id?: string
          occurs_on?: string
          owner_id?: string
          strategy?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortgage_overpayment_mortgage_fk"
            columns: ["owner_id", "mortgage_id"]
            isOneToOne: false
            referencedRelation: "mortgage_loans"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      mortgage_rate_periods: {
        Row: {
          ends_on: string | null
          fixed_rate: number | null
          id: string
          mortgage_id: string
          owner_id: string
          position: number
          rate_type: string
          starts_on: string
        }
        Insert: {
          ends_on?: string | null
          fixed_rate?: number | null
          id?: string
          mortgage_id: string
          owner_id: string
          position: number
          rate_type: string
          starts_on: string
        }
        Update: {
          ends_on?: string | null
          fixed_rate?: number | null
          id?: string
          mortgage_id?: string
          owner_id?: string
          position?: number
          rate_type?: string
          starts_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortgage_rate_period_mortgage_fk"
            columns: ["owner_id", "mortgage_id"]
            isOneToOne: false
            referencedRelation: "mortgage_loans"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      mortgage_schedule_entries: {
        Row: {
          annual_rate: number
          created_at: string
          entry_type: string
          id: string
          interest_part: number
          mortgage_id: string
          opening_balance: number
          owner_id: string
          payment: number
          principal_part: number
          rate_status: string
          remaining_principal: number
          revision: number
          scheduled_for: string
          sequence: number
          wibor_rate_date: string | null
          wibor_value: number | null
        }
        Insert: {
          annual_rate: number
          created_at?: string
          entry_type: string
          id?: string
          interest_part: number
          mortgage_id: string
          opening_balance: number
          owner_id: string
          payment: number
          principal_part: number
          rate_status: string
          remaining_principal: number
          revision: number
          scheduled_for: string
          sequence: number
          wibor_rate_date?: string | null
          wibor_value?: number | null
        }
        Update: {
          annual_rate?: number
          created_at?: string
          entry_type?: string
          id?: string
          interest_part?: number
          mortgage_id?: string
          opening_balance?: number
          owner_id?: string
          payment?: number
          principal_part?: number
          rate_status?: string
          remaining_principal?: number
          revision?: number
          scheduled_for?: string
          sequence?: number
          wibor_rate_date?: string | null
          wibor_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mortgage_schedule_mortgage_fk"
            columns: ["owner_id", "mortgage_id"]
            isOneToOne: false
            referencedRelation: "mortgage_loans"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          creation_date: string
          id: string
          owner_id: string
          payload: Json
          read_at: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creation_date?: string
          id?: string
          owner_id: string
          payload?: Json
          read_at?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creation_date?: string
          id?: string
          owner_id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      places: {
        Row: {
          city: string | null
          country: string | null
          creation_date: string
          id: string
          name: string
          note: string | null
          owner_id: string
          postal_code: string | null
          street: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          creation_date?: string
          id?: string
          name: string
          note?: string | null
          owner_id: string
          postal_code?: string | null
          street?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          creation_date?: string
          id?: string
          name?: string
          note?: string | null
          owner_id?: string
          postal_code?: string | null
          street?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "places_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "places_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          creation_date: string
          full_name: string
          id: string
          is_admin: boolean
          language: string
          timezone: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          creation_date?: string
          full_name: string
          id: string
          is_admin?: boolean
          language?: string
          timezone?: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          creation_date?: string
          full_name?: string
          id?: string
          is_admin?: boolean
          language?: string
          timezone?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      recurring_transaction_occurrences: {
        Row: {
          amount: number | null
          amount_in_default: number | null
          created_at: string
          creation_date: string
          currency: string
          exchange_rate: number | null
          id: string
          owner_id: string
          recurring_transaction_id: string
          scheduled_for: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          amount_in_default?: number | null
          created_at?: string
          creation_date?: string
          currency: string
          exchange_rate?: number | null
          id?: string
          owner_id: string
          recurring_transaction_id: string
          scheduled_for: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          amount_in_default?: number | null
          created_at?: string
          creation_date?: string
          currency?: string
          exchange_rate?: number | null
          id?: string
          owner_id?: string
          recurring_transaction_id?: string
          scheduled_for?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transaction_occurrences_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transaction_occurrences_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "recurring_transaction_occurrences_recurring_fk"
            columns: ["owner_id", "recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["owner_id", "id"]
          },
          {
            foreignKeyName: "recurring_transaction_occurrences_transaction_fk"
            columns: ["owner_id", "transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      recurring_transaction_tags: {
        Row: {
          creation_date: string
          owner_id: string
          recurring_transaction_id: string
          tag_id: string
          updated_at: string
        }
        Insert: {
          creation_date?: string
          owner_id: string
          recurring_transaction_id: string
          tag_id: string
          updated_at?: string
        }
        Update: {
          creation_date?: string
          owner_id?: string
          recurring_transaction_id?: string
          tag_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transaction_tags_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transaction_tags_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "recurring_transaction_tags_recurring_fk"
            columns: ["owner_id", "recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["owner_id", "id"]
          },
          {
            foreignKeyName: "recurring_transaction_tags_tag_fk"
            columns: ["owner_id", "tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          allowance_connection_id: string | null
          amount: number
          amount_mode: string
          category_id: string
          creation_date: string
          cron_job_id: number | null
          currency: string
          direction: Database["public"]["Enums"]["transaction_direction"]
          end_date: string | null
          exchange_rate: number | null
          id: string
          is_paused: boolean
          last_run_at: string | null
          name: string
          owner_id: string
          paused_at: string | null
          schedule: string
          source_module: string
          start_date: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          allowance_connection_id?: string | null
          amount: number
          amount_mode?: string
          category_id: string
          creation_date?: string
          cron_job_id?: number | null
          currency: string
          direction?: Database["public"]["Enums"]["transaction_direction"]
          end_date?: string | null
          exchange_rate?: number | null
          id?: string
          is_paused?: boolean
          last_run_at?: string | null
          name: string
          owner_id: string
          paused_at?: string | null
          schedule: string
          source_module?: string
          start_date: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          allowance_connection_id?: string | null
          amount?: number
          amount_mode?: string
          category_id?: string
          creation_date?: string
          cron_job_id?: number | null
          currency?: string
          direction?: Database["public"]["Enums"]["transaction_direction"]
          end_date?: string | null
          exchange_rate?: number | null
          id?: string
          is_paused?: boolean
          last_run_at?: string | null
          name?: string
          owner_id?: string
          paused_at?: string | null
          schedule?: string
          source_module?: string
          start_date?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_allowance_connection_fk"
            columns: ["allowance_connection_id"]
            isOneToOne: false
            referencedRelation: "allowance_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_category_owner_fk"
            columns: ["owner_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["owner_id", "id"]
          },
          {
            foreignKeyName: "recurring_transactions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "recurring_transactions_wallet_owner_fk"
            columns: ["owner_id", "wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          creation_date: string
          icon: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          creation_date?: string
          icon?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          creation_date?: string
          icon?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      transaction_tags: {
        Row: {
          creation_date: string
          owner_id: string
          tag_id: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          creation_date?: string
          owner_id: string
          tag_id: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          creation_date?: string
          owner_id?: string
          tag_id?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "transaction_tags_tag_fk"
            columns: ["owner_id", "tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["owner_id", "id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_fk"
            columns: ["owner_id", "transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      transactions: {
        Row: {
          allowance_connection_id: string | null
          allowance_pair_id: string | null
          allowance_role: string | null
          amount: number
          amount_in_default: number
          category_id: string
          creation_date: string
          currency: string
          description: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          exchange_rate: number | null
          id: string
          import_fingerprint: string | null
          import_metadata: Json
          import_source: string | null
          imported_at: string | null
          is_automatic: boolean
          mortgage_entry_type: string | null
          mortgage_loan_id: string | null
          mortgage_schedule_entry_id: string | null
          occurred_at: string
          owner_id: string
          place_id: string | null
          recurring_scheduled_for: string | null
          recurring_transaction_id: string | null
          source_module: string
          transaction_state: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          allowance_connection_id?: string | null
          allowance_pair_id?: string | null
          allowance_role?: string | null
          amount: number
          amount_in_default?: number
          category_id: string
          creation_date?: string
          currency: string
          description?: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          exchange_rate?: number | null
          id?: string
          import_fingerprint?: string | null
          import_metadata?: Json
          import_source?: string | null
          imported_at?: string | null
          is_automatic?: boolean
          mortgage_entry_type?: string | null
          mortgage_loan_id?: string | null
          mortgage_schedule_entry_id?: string | null
          occurred_at: string
          owner_id: string
          place_id?: string | null
          recurring_scheduled_for?: string | null
          recurring_transaction_id?: string | null
          source_module?: string
          transaction_state?: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          allowance_connection_id?: string | null
          allowance_pair_id?: string | null
          allowance_role?: string | null
          amount?: number
          amount_in_default?: number
          category_id?: string
          creation_date?: string
          currency?: string
          description?: string | null
          direction?: Database["public"]["Enums"]["transaction_direction"]
          exchange_rate?: number | null
          id?: string
          import_fingerprint?: string | null
          import_metadata?: Json
          import_source?: string | null
          imported_at?: string | null
          is_automatic?: boolean
          mortgage_entry_type?: string | null
          mortgage_loan_id?: string | null
          mortgage_schedule_entry_id?: string | null
          occurred_at?: string
          owner_id?: string
          place_id?: string | null
          recurring_scheduled_for?: string | null
          recurring_transaction_id?: string | null
          source_module?: string
          transaction_state?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_allowance_connection_fk"
            columns: ["allowance_connection_id"]
            isOneToOne: false
            referencedRelation: "allowance_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_owner_fk"
            columns: ["owner_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["owner_id", "id"]
          },
          {
            foreignKeyName: "transactions_mortgage_owner_fk"
            columns: ["owner_id", "mortgage_loan_id"]
            isOneToOne: false
            referencedRelation: "mortgage_loans"
            referencedColumns: ["owner_id", "id"]
          },
          {
            foreignKeyName: "transactions_mortgage_schedule_owner_fk"
            columns: ["owner_id", "mortgage_schedule_entry_id"]
            isOneToOne: false
            referencedRelation: "mortgage_schedule_entries"
            referencedColumns: ["owner_id", "id"]
          },
          {
            foreignKeyName: "transactions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "transactions_place_owner_fk"
            columns: ["owner_id", "place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["owner_id", "id"]
          },
          {
            foreignKeyName: "transactions_recurring_transaction_fk"
            columns: ["owner_id", "recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["owner_id", "id"]
          },
          {
            foreignKeyName: "transactions_wallet_owner_fk"
            columns: ["owner_id", "wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["owner_id", "id"]
          },
        ]
      }
      wallets: {
        Row: {
          creation_date: string
          currency_id: number
          id: string
          is_default: boolean
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          creation_date?: string
          currency_id?: number
          id?: string
          is_default?: boolean
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          creation_date?: string
          currency_id?: number
          id?: string
          is_default?: boolean
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions_overview"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      wibor_rates: {
        Row: {
          created_at: string
          rate_date: string
          source: string | null
          tenor: string
          value: number
        }
        Insert: {
          created_at?: string
          rate_date: string
          source?: string | null
          tenor: string
          value: number
        }
        Update: {
          created_at?: string
          rate_date?: string
          source?: string | null
          tenor?: string
          value?: number
        }
        Relationships: []
      }
    }
    Views: {
      recurring_transactions_overview: {
        Row: {
          monthly_expense: number | null
          owner_id: string | null
          recurring_transactions: Json | null
          yearly_expense: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_allowance_invitation: {
        Args: { p_token: string }
        Returns: string
      }
      activate_all_due_mortgage_transactions: {
        Args: { p_as_of?: string }
        Returns: number
      }
      activate_due_mortgage_transactions: {
        Args: { p_as_of?: string }
        Returns: number
      }
      available_transaction_months: {
        Args: { p_wallet_id?: string }
        Returns: {
          month_start: string
        }[]
      }
      category_expense_summary: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          category_color: string
          category_icon: string
          category_id: string
          category_name: string
          category_total_amount: number
          category_transaction_count: number
          group_color: string
          group_icon: string
          group_id: string
          group_name: string
          group_total_amount: number
          group_transaction_count: number
        }[]
      }
      complete_recurring_transaction_occurrence: {
        Args: { p_amount: number; p_occurrence_id: string }
        Returns: string
      }
      complete_standard_recurring_transaction_occurrence: {
        Args: { p_amount: number; p_occurrence_id: string }
        Returns: string
      }
      confirm_mcp_delete: { Args: { p_token: string }; Returns: Json }
      create_allowance_invitation: { Args: { p_email: string }; Returns: Json }
      create_allowance_recipient_expense: {
        Args: {
          p_amount: number
          p_connection_id: string
          p_currency: string
          p_description: string
          p_occurred_at: string
        }
        Returns: string
      }
      create_allowance_transaction: {
        Args: {
          p_amount: number
          p_category_id: string
          p_connection_id: string
          p_currency: string
          p_description: string
          p_occurred_at: string
          p_place_id?: string
          p_tag_ids?: string[]
          p_wallet_id: string
        }
        Returns: Json
      }
      create_allowance_transaction_pair_internal: {
        Args: {
          p_amount: number
          p_category_id: string
          p_connection_id: string
          p_currency: string
          p_description: string
          p_is_automatic?: boolean
          p_occurred_at: string
          p_payer_id: string
          p_place_id?: string
          p_recurring_id?: string
          p_scheduled_for?: string
          p_wallet_id: string
        }
        Returns: Json
      }
      delete_allowance_recipient_expense: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
      delete_allowance_transaction: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
      detach_mortgage_transactions: {
        Args: { p_mortgage_id: string }
        Returns: number
      }
      disconnect_allowance_connection: {
        Args: { p_connection_id: string }
        Returns: undefined
      }
      enqueue_recurring_transaction: {
        Args: { p_recurring_id: string; p_run_at?: string }
        Returns: string
      }
      enqueue_standard_recurring_transaction: {
        Args: { p_recurring_id: string; p_run_at?: string }
        Returns: string
      }
      ensure_allowance_connection: {
        Args: { p_invitation_id: string; p_recipient_id: string }
        Returns: string
      }
      ensure_allowance_expense_category: {
        Args: { p_recipient_id: string }
        Returns: string
      }
      find_existing_transaction_import_fingerprints: {
        Args: { p_import_fingerprints: string[]; p_import_source: string }
        Returns: {
          import_fingerprint: string
        }[]
      }
      get_allowance_connections: {
        Args: never
        Returns: {
          connected_at: string
          counterpart_email: string
          counterpart_id: string
          counterpart_name: string
          id: string
          role: string
          status: string
        }[]
      }
      get_allowance_recipient_expenses: {
        Args: never
        Returns: {
          amount: number
          connection_id: string
          created_at: string
          currency: string
          description: string
          occurred_at: string
          recipient_name: string
          transaction_id: string
          updated_at: string
        }[]
      }
      get_exchange_rate: {
        Args: {
          p_rate_date?: string
          p_source_currency: string
          p_target_currency: string
        }
        Returns: number
      }
      invoke_scheduled_edge_function: {
        Args: { p_body?: Json; p_function_name: string; p_secret_name: string }
        Returns: number
      }
      monthly_cashflow_summary: {
        Args: { p_months?: number; p_wallet_id?: string }
        Returns: {
          expense_total: number
          income_total: number
          month_start: string
        }[]
      }
      monthly_category_cashflow: {
        Args: { p_month_start: string; p_wallet_id?: string }
        Returns: {
          category_color: string
          category_icon: string
          category_id: string
          category_name: string
          direction: Database["public"]["Enums"]["transaction_direction"]
          month_start: string
          total_amount: number
          transaction_count: number
        }[]
      }
      monthly_recurring_transaction_summary: {
        Args: { p_wallet_id?: string }
        Returns: {
          expense_total: number
          income_total: number
          month_start: string
          transaction_count: number
        }[]
      }
      notify_admins_exchange_rates_sync_failed: {
        Args: { p_payload: Json }
        Returns: number
      }
      place_expense_summary: {
        Args: { p_wallet_id: string; p_year: number }
        Returns: {
          city: string
          country: string
          latest_transaction_at: string
          place_id: string
          place_name: string
          postal_code: string
          street: string
          total_amount: number
          transaction_count: number
        }[]
      }
      resolve_preferred_currency_id: {
        Args: { user_meta: Json }
        Returns: number
      }
      respond_allowance_invitation: {
        Args: { p_accept: boolean; p_invitation_id: string }
        Returns: string
      }
      set_allowance_invitation_delivery: {
        Args: { p_invitation_id: string; p_status: string }
        Returns: undefined
      }
      spendist_mcp_access_token_hook: { Args: { event: Json }; Returns: Json }
      sync_mortgage_transactions: {
        Args: { p_mortgage_id: string }
        Returns: number
      }
      update_allowance_recipient_expense: {
        Args: {
          p_amount: number
          p_currency: string
          p_description: string
          p_occurred_at: string
          p_transaction_id: string
        }
        Returns: string
      }
      update_allowance_transaction: {
        Args: {
          p_amount: number
          p_category_id: string
          p_currency: string
          p_description: string
          p_occurred_at: string
          p_place_id?: string
          p_transaction_id: string
          p_wallet_id: string
        }
        Returns: string
      }
    }
    Enums: {
      transaction_direction: "income" | "expense"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      transaction_direction: ["income", "expense"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const


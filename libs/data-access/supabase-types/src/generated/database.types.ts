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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          creation_date: string
          full_name: string
          id: string
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
          start_date: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
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
          start_date: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
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
          start_date?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
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
          amount: number
          amount_in_default: number
          category_id: string
          creation_date: string
          currency: string
          description: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          exchange_rate: number | null
          id: string
          is_automatic: boolean
          occurred_at: string
          owner_id: string
          recurring_scheduled_for: string | null
          recurring_transaction_id: string | null
          updated_at: string
          wallet_id: string
        }
        Insert: {
          amount: number
          amount_in_default?: number
          category_id: string
          creation_date?: string
          currency: string
          description?: string | null
          direction: Database["public"]["Enums"]["transaction_direction"]
          exchange_rate?: number | null
          id?: string
          is_automatic?: boolean
          occurred_at: string
          owner_id: string
          recurring_scheduled_for?: string | null
          recurring_transaction_id?: string | null
          updated_at?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          amount_in_default?: number
          category_id?: string
          creation_date?: string
          currency?: string
          description?: string | null
          direction?: Database["public"]["Enums"]["transaction_direction"]
          exchange_rate?: number | null
          id?: string
          is_automatic?: boolean
          occurred_at?: string
          owner_id?: string
          recurring_scheduled_for?: string | null
          recurring_transaction_id?: string | null
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_owner_fk"
            columns: ["owner_id", "category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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
      enqueue_recurring_transaction: {
        Args: { p_recurring_id: string; p_run_at?: string }
        Returns: string
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
      resolve_preferred_currency_id: {
        Args: { user_meta: Json }
        Returns: number
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


import type { Database } from '../generated/database.types';

type Functions = Database['public']['Functions'];

type NullableArguments<
  Name extends keyof Functions,
  Key extends keyof Functions[Name]['Args']
> = Omit<Functions[Name], 'Args'> & {
  Args: Omit<Functions[Name]['Args'], Key> & {
    [Argument in Key]: Functions[Name]['Args'][Argument] | null;
  };
};

/**
 * Postgres accepts NULL for these RPC arguments, as defined by the versioned
 * SQL functions. Supabase's generated argument types omit that nullability.
 * Keep the correction separate so regenerating the schema cannot erase it.
 */
export type ClientDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Functions'> & {
    Functions: Omit<
      Functions,
      | 'category_expense_summary'
      | 'create_allowance_transaction'
      | 'update_allowance_transaction'
      | 'create_allowance_recipient_expense'
      | 'update_allowance_recipient_expense'
    > & {
      category_expense_summary: NullableArguments<
        'category_expense_summary',
        'p_from' | 'p_to'
      >;
      create_allowance_transaction: NullableArguments<
        'create_allowance_transaction',
        'p_description' | 'p_place_id'
      >;
      update_allowance_transaction: NullableArguments<
        'update_allowance_transaction',
        'p_description' | 'p_place_id'
      >;
      create_allowance_recipient_expense: NullableArguments<
        'create_allowance_recipient_expense',
        'p_description'
      >;
      update_allowance_recipient_expense: NullableArguments<
        'update_allowance_recipient_expense',
        'p_description'
      >;
    };
  };
};

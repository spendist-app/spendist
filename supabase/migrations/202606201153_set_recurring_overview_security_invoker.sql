alter view public.recurring_transactions_overview
  set (security_invoker = true);

comment on view public.recurring_transactions_overview
  is 'Recurring payment summary evaluated with the querying role permissions and RLS policies.';

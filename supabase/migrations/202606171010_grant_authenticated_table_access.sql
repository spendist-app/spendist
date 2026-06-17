grant usage on schema public to anon, authenticated;

grant select, update on table public.profiles to authenticated;

grant select, insert, update, delete on table public.wallets to authenticated;
grant select, insert, update, delete on table public.categories_group to authenticated;
grant select, insert, update, delete on table public.categories to authenticated;
grant select, insert, update, delete on table public.tags to authenticated;
grant select, insert, update, delete on table public.transactions to authenticated;
grant select, insert, update, delete on table public.transaction_tags to authenticated;
grant select, insert, update, delete on table public.recurring_transactions to authenticated;
grant select, insert, update, delete on table public.recurring_transaction_tags to authenticated;
grant select, insert, update, delete on table public.recurring_transaction_occurrences to authenticated;
grant select, insert, update, delete on table public.notifications to authenticated;
grant select, insert, update, delete on table public.places to authenticated;

grant select on table public.currencies to anon, authenticated;
grant select on table public.exchange_rates to anon, authenticated;
grant select on table public.recurring_transactions_overview to authenticated, service_role, anon;

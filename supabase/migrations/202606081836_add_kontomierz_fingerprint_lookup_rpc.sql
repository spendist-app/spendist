create or replace function public.find_existing_transaction_import_fingerprints(
  p_import_source text,
  p_import_fingerprints text[]
)
returns table(import_fingerprint text)
language sql
stable
security invoker
set search_path = public
as $$
  select t.import_fingerprint
  from public.transactions as t
  where t.owner_id = auth.uid()
    and t.import_source = p_import_source
    and t.import_fingerprint = any(p_import_fingerprints)
    and t.import_fingerprint is not null;
$$;

grant execute on function public.find_existing_transaction_import_fingerprints(text, text[]) to authenticated;

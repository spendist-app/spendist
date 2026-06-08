alter table public.transactions
  add column if not exists import_source text,
  add column if not exists import_fingerprint text,
  add column if not exists import_metadata jsonb not null default '{}'::jsonb,
  add column if not exists imported_at timestamptz;

create unique index if not exists transactions_owner_import_fingerprint_idx
  on public.transactions (owner_id, import_source, import_fingerprint)
  where import_source is not null
    and import_fingerprint is not null;

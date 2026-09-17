-- Clients. Name, phone, a birthday without a year. Spec §6.2, D26.

create extension if not exists unaccent with schema extensions;

-- unaccent() is STABLE, not IMMUTABLE, so it cannot be indexed directly.
create function public.immutable_unaccent(text) returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

create table client (
  id                    uuid primary key default gen_random_uuid(),
  full_name             text not null,
  phone                 text,
  -- The birth YEAR is deliberately not collected. Spec §6.2.1.
  birth_month           smallint check (birth_month between 1 and 12),
  birth_day             smallint check (birth_day between 1 and 31),
  preferred_operator_id uuid references operator (id) on delete set null,
  no_messages           boolean not null default false,
  created_at            timestamptz not null default now(),
  -- A date, never a timestamp: compared against a date in the retention sweep,
  -- and a timestamptz would drag that into the session's zone. Spec §6.2.2.
  last_activity_at      date,

  constraint client_birthday_pair check ((birth_month is null) = (birth_day is null)),
  -- Days-per-month with February at 29, so an impossible pair is REJECTED
  -- rather than raising a date-construction error. Spec §6.2.1.
  constraint client_birthday_real check (
    birth_month is null
    or birth_day <= (array[31,29,31,30,31,30,31,31,30,31,30,31])[birth_month]
  )
);

create index client_name_search on client (immutable_unaccent(full_name));
create index client_phone_search on client (phone);
create index client_birthday on client (birth_month, birth_day);

alter table client enable row level security;

create policy client_access on client
  for all using (app.is_active_operator()) with check (app.is_active_operator());

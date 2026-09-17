-- Access control and the operator roster. Spec §4.2, §4.3, §6.1, D30.

-- Schema-qualified: Supabase keeps extensions out of public, and an
-- unqualified `if not exists` silently no-ops if a future base image
-- pre-installs one elsewhere — after which immutable_unaccent fails at
-- creation and takes every later migration with it.
create extension if not exists btree_gist with schema extensions;

create schema if not exists app;
grant usage on schema app to authenticated, anon;

create table operator (
  id            uuid primary key default gen_random_uuid(),
  -- Deliberately NOT a foreign key to auth.users: that schema is managed by
  -- Supabase and a reference would couple these migrations to it.
  auth_user_id  uuid unique,
  name          text not null,
  color         text not null,
  is_active     boolean not null default true,
  sort_order    integer not null default 0
);

-- Row-level security is bypassed by the OWNER of a table, and this function's
-- owner also owns public.operator — which is why the lookup inside a policy on
-- `operator` does not re-enter that policy. `security definer` alone would not
-- do it. Spec §4.3.
create function app.is_active_operator() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.operator o
    where o.auth_user_id = auth.uid()
      and o.is_active
  )
$$;

grant execute on function app.is_active_operator() to authenticated, anon;

-- A policy on a table WITHOUT row-level security enabled is inert. Spec §4.3.
alter table operator enable row level security;

create policy operator_access on operator
  for all
  using (app.is_active_operator())
  with check (app.is_active_operator());

-- Seeded, not created at first run: access depends on a row being here, so a
-- first run that had to write the first row could never write it. Spec D30.
insert into operator (id, auth_user_id, name, color, sort_order) values
  ('10000000-0000-4000-8000-000000000001', null, 'Vera',       '#C2185B', 1),
  ('10000000-0000-4000-8000-000000000002', null, 'Annalisa',   '#7B3F61', 2),
  ('10000000-0000-4000-8000-000000000003', null, 'Alessandra', '#2F6F6B', 3);

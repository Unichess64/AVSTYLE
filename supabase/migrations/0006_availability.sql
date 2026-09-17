-- Availability: the typical week, per-date exceptions, salon closures.
-- Spec §6.5, D5, D6.

create table weekly_availability (
  id             uuid primary key default gen_random_uuid(),
  operator_id    uuid not null references operator (id) on delete cascade,
  weekday        smallint not null check (weekday between 0 and 6), -- 0 = Monday
  start_boundary smallint not null check (start_boundary between 0 and 288),
  end_boundary   smallint not null check (end_boundary between 0 and 288),
  check (end_boundary > start_boundary),

  -- Enforced, not prose. Touching ranges stay legal; folding them is the
  -- resolver's job (spec §7.1 step 4).
  exclude using gist (
    operator_id with =,
    weekday with =,
    int4range(start_boundary, end_boundary) with &&
  )
);

-- An exception replaces the day. ZERO RANGES MEANS AWAY: there is no flag,
-- because a flag made "not absent with no ranges" resolve identically to
-- "absent" — one meaning with two spellings. Spec §6.5.
create table exception_day (
  id             uuid primary key default gen_random_uuid(),
  operator_id    uuid not null references operator (id) on delete cascade,
  exception_date date not null,
  unique (operator_id, exception_date)
);

create table exception_range (
  id               uuid primary key default gen_random_uuid(),
  exception_day_id uuid not null references exception_day (id) on delete cascade,
  start_boundary   smallint not null check (start_boundary between 0 and 288),
  end_boundary     smallint not null check (end_boundary between 0 and 288),
  check (end_boundary > start_boundary),

  -- Keyed on exception_day_id: this table has neither operator_id nor weekday.
  exclude using gist (
    exception_day_id with =,
    int4range(start_boundary, end_boundary) with &&
  )
);

create table salon_closure (
  id             uuid primary key default gen_random_uuid(),
  start_date     date not null,
  end_date       date not null,
  -- Both null: whole days. Both set: this window is cut out of EVERY date in
  -- the range, which is how a week of reduced hours is expressed.
  from_boundary  smallint check (from_boundary between 0 and 288),
  to_boundary    smallint check (to_boundary between 0 and 288),
  reason         text not null,

  check (end_date >= start_date),
  constraint salon_closure_boundary_pair check ((from_boundary is null) = (to_boundary is null)),
  constraint salon_closure_boundary_order check (to_boundary is null or to_boundary > from_boundary)
);

create index exception_day_lookup on exception_day (operator_id, exception_date);
create index salon_closure_lookup on salon_closure (start_date, end_date);

alter table weekly_availability enable row level security;
alter table exception_day enable row level security;
alter table exception_range enable row level security;
alter table salon_closure enable row level security;

create policy weekly_availability_access on weekly_availability
  for all using (app.is_active_operator()) with check (app.is_active_operator());
create policy exception_day_access on exception_day
  for all using (app.is_active_operator()) with check (app.is_active_operator());
create policy exception_range_access on exception_range
  for all using (app.is_active_operator()) with check (app.is_active_operator());
create policy salon_closure_access on salon_closure
  for all using (app.is_active_operator()) with check (app.is_active_operator());

-- Privilege baseline for these four new tables, same reasoning as
-- 00051_privilege_baseline.sql: Supabase grants anon and authenticated the
-- full default ACL (delete, insert, references, select, trigger, truncate,
-- update, maintain) on every table it creates in public, and row-level
-- security does NOT gate TRUNCATE or MAINTAIN. 00051 closed this for the
-- tables that existed at the time; it is a fixed list of per-table
-- statements and cannot reach tables created afterwards, so every migration
-- that adds a table must repeat the revoke for its own tables. The
-- schema-wide audit in tests/schema/catalogue-audit.test.ts enumerates the
-- catalogue via `pg_class.relacl` rather than a hardcoded list (and rather
-- than `information_schema.role_table_grants`, whose privilege vocabulary
-- does not include MAINTAIN — see that file), so it is a check on this
-- block, not a substitute for it.
--
-- TRUNCATE/REFERENCES/TRIGGER/MAINTAIN: revoked from both roles. None is
-- used by the application, and TRUNCATE and MAINTAIN in particular bypass
-- RLS entirely (RLS gates only SELECT/INSERT/UPDATE/DELETE) — MAINTAIN
-- covers LOCK, VACUUM, ANALYZE, CLUSTER and REINDEX, so leaving it granted
-- lets an unauthenticated caller take an ACCESS EXCLUSIVE lock and block
-- every reader of the table.
revoke truncate, references, trigger, maintain on weekly_availability from authenticated, anon;
revoke truncate, references, trigger, maintain on exception_day from authenticated, anon;
revoke truncate, references, trigger, maintain on exception_range from authenticated, anon;
revoke truncate, references, trigger, maintain on salon_closure from authenticated, anon;

-- INSERT/UPDATE/DELETE: revoked from anon only. anon can never satisfy
-- app.is_active_operator(), so this removes nothing anon legitimately uses;
-- it is defence in depth against a future policy mistake. SELECT stays
-- granted to anon so an anonymous visitor sees zero rows (RLS filtering)
-- rather than a permission error, matching the existing tests' expectation.
-- authenticated keeps insert/update/delete: row-level security arbitrates
-- those for the application.
revoke insert, update, delete on weekly_availability from anon;
revoke insert, update, delete on exception_day from anon;
revoke insert, update, delete on exception_range from anon;
revoke insert, update, delete on salon_closure from anon;

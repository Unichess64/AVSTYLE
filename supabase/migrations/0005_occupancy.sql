-- The occupancy guarantee. Spec §6.4, D17.

create table appointment_slot (
  appointment_id   uuid not null,
  operator_id      uuid not null,
  appointment_date date not null,
  cell_index       smallint not null check (cell_index between 0 and 287),

  primary key (appointment_id, cell_index),

  -- Measure 3. A CHECK cannot read another row, so drift is prevented by a
  -- composite key: the child cannot name an operator or date its parent does
  -- not have. ON DELETE CASCADE keeps deletion executable.
  constraint appointment_slot_parent_fk
    foreign key (appointment_id, operator_id, appointment_date)
    references appointment (id, operator_id, appointment_date)
    on update cascade on delete cascade
);

-- Measure 1. DEFERRABLE because within ONE statement the row-level AFTER
-- trigger fires per row, so the first row's inserts would collide with the
-- second row's not-yet-deleted cells. It does NOT make a swap across two
-- PostgREST calls possible — each call is its own transaction (spec §4.6).
alter table appointment_slot
  add constraint appointment_slot_unique
  unique (operator_id, appointment_date, cell_index)
  deferrable initially deferred;

-- Measure 4. All three events, NO column list, and the delete matches on
-- appointment_id ALONE: matching also on the cascaded columns would miss rows
-- the foreign key has already rewritten, after which the re-insert violates
-- the primary key and every reassignment fails.
--
-- Measured note (spec §6.4): the 'zz_' prefix is NOT load-bearing — renaming
-- the trigger changed nothing — and the composite key's ON UPDATE CASCADE
-- shadows much of what "no column list" protects. Both are kept as discipline:
-- the trigger must own its rows rather than leaving a cascade to repair them.
create function app.sync_appointment_slots() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    delete from public.appointment_slot where appointment_id = old.id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    insert into public.appointment_slot (appointment_id, operator_id, appointment_date, cell_index)
    select new.id, new.operator_id, new.appointment_date, g
    from generate_series(new.start_cell, new.start_cell + new.cell_count - 1) as g;
  end if;

  return null;
end
$$;

create trigger zz_sync_appointment_slots
  after insert or update or delete on appointment
  for each row execute function app.sync_appointment_slots();

-- Measure 2. The application MUST read this table (the availability query,
-- the narrowing check, the conflict pre-check and the day view all do), so
-- SELECT is the only privilege left standing. REVOKE ALL would have taken
-- SELECT with it — so every write-shaped privilege is named explicitly
-- instead: insert, update, delete, AND, critically, truncate, references and
-- trigger.
--
-- TRUNCATE is named on purpose, not swept up by a wildcard: Supabase's
-- default ACL grants it to authenticated and anon (rDxtm — read, references,
-- trigger, truncate, maintain), and row-level security does NOT apply to
-- TRUNCATE — RLS only gates SELECT/INSERT/UPDATE/DELETE. Left in place, an
-- authenticated client could `truncate table appointment_slot` (refused
-- only by this revoke, not by RLS) and then insert a clashing appointment
-- with no rows left for the deferred unique constraint to collide against —
-- a committed double booking the occupancy guarantee exists to prevent.
-- REFERENCES and TRIGGER are revoked for the same reason: unrevoked DDL-ish
-- privileges are exactly the kind of gap RLS cannot close.
revoke insert, update, delete, truncate, references, trigger on appointment_slot from authenticated, anon;

alter table appointment_slot enable row level security;

create policy appointment_slot_read on appointment_slot
  for select using (app.is_active_operator());

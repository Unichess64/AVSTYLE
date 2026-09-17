-- last_activity_at: the value the retention sweep deletes on. Spec §6.2.2.

create function app.touch_client_activity() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected uuid[];
begin
  -- tg_relid, not tg_table_name: a name match would also fire on a `visit`
  -- table in some OTHER schema. Not reachable today (this trigger is only
  -- ever installed on public.visit/public.appointment), but exact and free.
  if tg_relid = 'public.visit'::regclass then
    affected := array_remove(array[
      (case when tg_op in ('INSERT', 'UPDATE') then new.client_id end),
      (case when tg_op in ('UPDATE', 'DELETE') then old.client_id end)
    ], null);
  else
    affected := array_remove(array[
      (select v.client_id from public.visit v
        where v.id = (case when tg_op in ('INSERT', 'UPDATE') then new.visit_id end)),
      (select v.client_id from public.visit v
        where v.id = (case when tg_op in ('UPDATE', 'DELETE') then old.visit_id end))
    ], null);
  end if;

  -- Lock the affected client rows BEFORE the UPDATE below, in a deterministic
  -- order (order by id — same reasoning as the operator lockout guard: a fixed
  -- lock order prevents a deadlock between two sessions that touch the same
  -- two clients in opposite order). Without this, under READ COMMITTED, an
  -- UPDATE that blocks on this row and then unblocks is re-projected by
  -- Postgres's EvalPlanQual using the STATEMENT'S ORIGINAL snapshot — which
  -- cannot see the other, now-committed transaction's visit/appointment.
  -- Measured: T1 books 2027-06-01, T2 concurrently books 2026-01-05 for the
  -- same client; T2's UPDATE blocks on T1's row lock, then unblocks and
  -- recomputes max() from ONLY its own (stale-snapshot) data, overwriting
  -- T1's correct, already-committed 2027-06-01 with 2026-01-05 — seventeen
  -- months backwards, enough to make the retention sweep delete a client who
  -- has a booking next year. Taking the lock here first means the UPDATE
  -- that follows opens its OWN fresh statement snapshot once unblocked,
  -- which already includes the other transaction's commit.
  perform 1 from public.client where id = any(affected) order by id for update;

  update public.client c
  set last_activity_at = (
    -- Future visits included: a dormant client who has just rebooked must not
    -- become eligible and be swept before she arrives.
    select max(v.visit_date)
    from public.visit v
    join public.appointment a on a.visit_id = v.id
    where v.client_id = c.id
  )
  where c.id = any(affected);

  return null;
end
$$;

-- DEFERRABLE INITIALLY DEFERRED, not a plain trigger. Measured live against
-- occupancy.test.ts's "rejects a concurrent booking of the same cells at
-- commit time": that test opens two overlapping, uncommitted transactions
-- (a, b) that both insert an appointment for the SAME visit, relying on
-- appointment_slot's own deferred unique constraint to let b's insert
-- "resolve: deferred constraints do not check here" before a commits. A
-- plain AFTER ROW trigger here would run its `update client` synchronously
-- inside each insert, and since both appointments share one client row, b's
-- update blocks on the row lock a's still-open transaction holds — and
-- because the test never issues a's COMMIT until b's insert resolves, this
-- is an unconditional hang, not a slow test (confirmed: b's insert sat
-- blocked until manually killed; converting both triggers to deferred
-- constraint triggers below made it resolve immediately). Deferring to
-- commit avoids the hot-row contention entirely and is equivalent for every
-- other caller in this schema: nothing here reads `client` again inside the
-- same still-open transaction it wrote in.
create constraint trigger zz_touch_client_activity
  after insert or update or delete on appointment
  deferrable initially deferred
  for each row execute function app.touch_client_activity();

create constraint trigger zz_touch_client_activity
  after insert or update or delete on visit
  deferrable initially deferred
  for each row execute function app.touch_client_activity();

-- Known, accepted gap: `truncate table appointment cascade` (or `visit
-- cascade`) fires no row trigger at all — TRUNCATE never fires row-level
-- triggers, and a CONSTRAINT trigger additionally cannot even be declared
-- `FOR EACH STATEMENT ... ON TRUNCATE` (constraint triggers are FOR EACH ROW
-- only), so the divergence to constraint triggers above forecloses the
-- usual statement-trigger remedy. A client whose only visit/appointment
-- rows are removed this way keeps her last-computed last_activity_at
-- frozen instead of reverting to null, so she is never picked up by the
-- retention sweep through this path — over-retention, not data loss, and
-- narrow: `00051_privilege_baseline.sql` revokes TRUNCATE on `appointment`
-- and `visit` from both `anon` and `authenticated`, so only the database
-- owner can reach it, never the application.

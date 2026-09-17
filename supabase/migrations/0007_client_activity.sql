-- last_activity_at: the value the retention sweep deletes on. Spec §6.2.2.

create function app.touch_client_activity() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected uuid[];
begin
  if tg_table_name = 'visit' then
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

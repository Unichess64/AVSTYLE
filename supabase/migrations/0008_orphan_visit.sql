-- An orphan visit is impossible. Spec §6.3.
--
-- The ROW LOCK is the whole mechanism. Without it, two operators deleting the
-- two halves concurrently each still see the other's uncommitted survivor,
-- neither deletes, and the orphan's future date keeps its client out of the
-- retention sweep for ever. Moving logic into the database does not serialise
-- it; taking a lock does.

create function app.delete_orphan_visit() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked uuid;
begin
  select v.id into locked
  from public.visit v
  where v.id = old.visit_id
  for update;

  if locked is null then
    return null; -- already gone: a cascade from client deletion
  end if;

  if not exists (select 1 from public.appointment a where a.visit_id = locked) then
    delete from public.visit where id = locked;
  end if;

  return null;
end
$$;

-- Plain AFTER ROW trigger, not a constraint trigger, unlike the neighbouring
-- zz_touch_client_activity on the same table. That trigger was made
-- DEFERRABLE INITIALLY DEFERRED because it synchronously locks and updates
-- `client` rows shared across sibling appointments of the same visit, and a
-- plain trigger there deadlocked occupancy.test.ts's overlapping-insert case
-- (0007_client_activity.sql). This trigger locks and deletes `visit` rows
-- instead, and every `visit` touched here is the private parent of the one
-- `appointment` row just deleted, so there is no analogous cross-row
-- contention to defer: firing immediately is what makes the row lock below
-- observable within the same statement, which is the whole point (Step 5 of
-- this task's plan proves it — remove the lock and the concurrent-overlap
-- test goes red).
--
-- Ordering against the deferred client-activity trigger: because that
-- trigger is deferred, every transaction that reaches both this trigger and
-- that one always acquires the `visit` row lock (here, synchronously, during
-- the DELETE) strictly BEFORE the `client` row lock (there, only at COMMIT
-- time). This ordering is structural, not a convention that could be
-- violated by a future caller — a deferred trigger cannot run before the
-- statement that queued it finishes — so the two functions can never
-- acquire `visit` and `client` locks in reversed order against each other,
-- and cannot deadlock against each other through those two locks.
--
-- Termination through `delete from client`: client → visit → appointment is
-- two ON DELETE CASCADE foreign keys (visit.client_id, then
-- appointment_visit_date_fk), not application code. By the time the nested
-- cascade delete on `appointment` fires this trigger, the referential-
-- integrity cascade has already deleted the `visit` row itself (that delete
-- is what triggered the cascade delete of its `appointment` children in the
-- first place), so `old.visit_id` no longer resolves to a live row: `locked`
-- comes back null and the trigger returns immediately. No further deletes
-- are issued, so there is no recursion to terminate.
create trigger zz_delete_orphan_visit
  after delete on appointment
  for each row execute function app.delete_orphan_visit();

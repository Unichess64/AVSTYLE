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
-- trigger is deferred, every transaction that reaches BOTH THESE TWO
-- TRIGGER FUNCTIONS always acquires the `visit` row lock (here,
-- synchronously, during the DELETE) strictly BEFORE the `client` row lock
-- (there, only at COMMIT time) — a deferred trigger cannot run before the
-- statement that queued it finishes, so between delete_orphan_visit and
-- touch_client_activity specifically, the order can never invert. That is
-- the ONLY guarantee this structure provides. It is NOT a schema-wide
-- guarantee and IS a convention a caller can violate — and this is not a
-- hypothetical future caller: `delete from client` is exactly such a caller
-- TODAY, reached through §11.3's right of erasure, not through code that
-- does not exist yet. `client → visit → appointment` is two ON DELETE
-- CASCADE foreign keys, so `delete from client` locks the client row FIRST,
-- then cascades into `visit` — client before visit, the reverse of this
-- trigger's own order. Measured 6/6: a transaction that runs `delete from
-- appointment` against one appointment of a two-appointment visit (this
-- trigger locks that visit row, via update, and does not delete it while
-- the sibling appointment survives) concurrently with a transaction running
-- `delete from client` on that visit's client (which locks the client row,
-- then blocks cascading into the same visit row this trigger already
-- holds) deadlocks: the first transaction's own deferred
-- zz_touch_client_activity fires at COMMIT and blocks on the client row the
-- second transaction holds, while the second blocks on the visit row the
-- first holds — a genuine 40P01 cycle, not a hang. This is covered by two
-- existing tests: orphan-visit.test.ts's *"keeps the visit while an
-- appointment remains"* (which takes the visit-row lock this scenario
-- depends on) and *"survives a client deletion cascading through both"*
-- (which exercises `delete from client` terminating cleanly on its own).
-- Any code added later that locks both `client` and `visit` must take
-- `visit` before `client`, matching this trigger — `delete from client`
-- itself cannot be reordered, since the cascade direction is fixed by the
-- foreign keys, so this is a live, accepted deadlock shape, not merely a
-- documented risk. See spec §10.5 and §12.1.
--
-- Separately, and independent of `client` entirely: this trigger's OWN lock
-- can deadlock against itself. Two SEQUENTIAL single-row
-- `delete from appointment where id = ...` statements against appointments
-- of two different visits, issued in reversed order across two concurrent
-- transactions (T1: visit A then visit B; T2: visit B then visit A),
-- deadlocked 5/5 runs measured (40P01) — each transaction holds one visit's
-- lock and blocks on the other's. A single multi-row `DELETE ... WHERE id
-- IN (...)` spanning both visits does NOT deadlock, because Postgres scans
-- and locks in physical row order in both sessions. No flow the spec
-- describes today issues sequential single-row deletes across visits in
-- caller-controlled order, so this is not reachable yet — but a future
-- caller that does must lock visits in a fixed order (id order, matching
-- touch_client_activity's own `order by id` discipline for `client`), not
-- caller-supplied order.
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

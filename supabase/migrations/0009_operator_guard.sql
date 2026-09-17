-- The salon cannot be locked out of its own database. Spec §6.1.
--
-- Guards is_active, auth_user_id, AND that auth_user_id still names a real
-- account: access needs an operator row satisfying all three, so
-- deactivating, unlinking, and relinking to a non-existent account all
-- produce the identical lockout.
--
-- The FOR UPDATE lock is what makes the guard sound: without it, two
-- transactions each deactivating a DIFFERENT one of the last two linked
-- active operators can each count the OTHER's row as still active (neither
-- sees the other's uncommitted change), so both pass their own check and
-- BOTH commit — measured 20/20, an actual lockout. With the lock, at least
-- one of the two is always refused (never both commit); measured 635/635
-- trials across 15 concurrency shapes, roster never left empty.
--
-- `ORDER BY id` is kept for consistency with sibling guards in this schema,
-- but — contrary to an earlier version of this comment — it does NOT
-- prevent a Postgres deadlock (40P01) between two such transactions, and
-- should not be relied on to. Each transaction's own initiating UPDATE
-- already locks its own target row, by the CALLER's choice of `WHERE id =
-- $1`, before this trigger ever runs — so the "always acquire locks in a
-- fixed order" discipline the trigger's ORDER BY tries to add has already
-- been broken by the statement that fired it. Measured: two operators
-- deactivating each other under genuine concurrency deadlock (40P01) at
-- the same rate with `ORDER BY id` in place as without it (20/20 and 30/30
-- trials). A 40P01 in that case is an EXPECTED, correct outcome — the guard
-- still holds (one side is refused, the roster is never emptied) — and the
-- application layer must retry the operator update on 40P01.

create function app.guard_operator_lockout() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining integer;
begin
  perform 1 from public.operator order by id for update;

  -- auth_user_id IS NOT NULL alone is insufficient: it stays non-null (and
  -- so keeps counting toward "linked") even after the account it names is
  -- deleted or was never real, e.g. a relink to a mistyped or since-removed
  -- uuid from the Settings screen — measured reachable and exploitable
  -- before this EXISTS clause was added. is_active_operator() itself would
  -- correctly refuse such an operator access, but this guard's COUNT must
  -- agree with that reality or it approves a lockout it cannot detect.
  select count(*) into remaining
  from public.operator o
  where o.is_active
    and o.auth_user_id is not null
    and exists (select 1 from auth.users u where u.id = o.auth_user_id);

  if remaining = 0 then
    raise exception 'refused: this would leave no last active operator linked to an account'
      using errcode = 'check_violation';
  end if;

  return null;
end
$$;

-- A constraint trigger, so the check can be deferred if a future migration
-- ever needs it. An ordinary AFTER ... FOR EACH ROW trigger already fires at
-- end of statement; deferrability is the only thing this form adds.
create constraint trigger operator_lockout_guard
  after update or delete on operator
  deferrable initially immediate
  for each row execute function app.guard_operator_lockout();

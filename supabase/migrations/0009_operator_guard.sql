-- The salon cannot be locked out of its own database. Spec §6.1.
--
-- Guards BOTH is_active and auth_user_id: access needs each of them, so
-- pressing "scollega" produces the identical lockout as deactivating.
--
-- ORDER BY id is not decoration. Without a deterministic lock order, two
-- sessions updating different operator rows each hold their target and then
-- try to lock the rest: measured 40P01, a deadlock, instead of the sentence.

create function app.guard_operator_lockout() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining integer;
begin
  perform 1 from public.operator order by id for update;

  select count(*) into remaining
  from public.operator o
  where o.is_active and o.auth_user_id is not null;

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

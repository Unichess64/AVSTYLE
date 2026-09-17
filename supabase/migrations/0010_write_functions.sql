-- Transactional writes. Spec §4.6, D29.
--
-- On PostgREST every call is its own transaction, so a deferred constraint
-- buys nothing ACROSS calls: moving a two-service visit as two updates fails
-- every time, because the first update's new cells collide with the second
-- appointment's untouched ones. These functions ARE the transaction.
--
-- Each ends with SET CONSTRAINTS ALL IMMEDIATE so a violation surfaces HERE,
-- catchable and nameable (spec §10.1), rather than at COMMIT as an opaque
-- error. It is the last statement, because afterwards the constraint stays
-- immediate for the rest of the transaction.
--
-- security INVOKER throughout: they run under the caller's row-level security,
-- not above it.

create function public.move_visit(
  p_visit_id    uuid,
  p_new_date    date,
  p_shift_cells integer
) returns void
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  -- Re-defer at entry, not just rely on the constraint's own DEFERRABLE
  -- INITIALLY DEFERRED default. A PRIOR call to this function (or to
  -- swap_appointment_operators) inside the SAME explicit transaction left
  -- appointment_slot_unique in IMMEDIATE mode via ITS OWN trailing
  -- SET CONSTRAINTS ALL IMMEDIATE below — and per Postgres semantics that
  -- mode persists for the REST OF THE TRANSACTION, not just that one call.
  -- Without this line, a second, otherwise non-colliding move_visit call in
  -- the same explicit transaction has its own two updates below checked
  -- row by row as they happen, and the first one's intermediate state can
  -- transiently violate the unique constraint against the second, not-yet-
  -- applied one — a false collision purely from call ordering. Fix-round-1
  -- Step: removing this line reproduces exactly that, live.
  set constraints appointment_slot_unique deferred;

  update visit set visit_date = p_new_date where id = p_visit_id;

  -- FOUND is false when no row matched — a visit that does not exist, or
  -- one row-level security makes invisible to this caller (an outsider, or
  -- an operator whose own account was just deactivated), must not look
  -- like a silent success: the app's "this was deleted while you had it
  -- open" message depends on telling that apart from an ordinary update.
  -- Checking only here, not again after the appointment update below, is
  -- sufficient: zz_delete_orphan_visit (0008_orphan_visit.sql) guarantees
  -- every visit that still exists has at least one appointment, so a real,
  -- visible visit can never leave that second update matching zero rows.
  if not found then
    raise exception 'move_visit: visit % not found or not visible to caller', p_visit_id
      using errcode = 'P0002';
  end if;

  if p_shift_cells <> 0 then
    update appointment
    set start_cell = start_cell + p_shift_cells
    where visit_id = p_visit_id;
  end if;

  set constraints all immediate;
end
$$;

create function public.swap_appointment_operators(p_a uuid, p_b uuid) returns void
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  op_a uuid;
  op_b uuid;
begin
  -- See move_visit above for why this is needed at entry.
  set constraints appointment_slot_unique deferred;

  -- Ordered, for the same reason as the lockout guard.
  perform 1 from appointment where id in (p_a, p_b) order by id for update;

  select operator_id into op_a from appointment where id = p_a;
  select operator_id into op_b from appointment where id = p_b;

  -- operator_id is NOT NULL on every real appointment row, so a null here
  -- means the id named no row this caller can see (gone, or hidden by RLS)
  -- — not a silent no-op, for the same "was this deleted while I had it
  -- open" reason as move_visit's check above.
  --
  -- p_a = p_b is deliberately left as a harmless no-op rather than raised:
  -- both updates below simply write back the value already there, nothing
  -- is corrupted, and it is not a caller mistake worth refusing.
  if op_a is null then
    raise exception 'swap_appointment_operators: appointment % not found or not visible to caller', p_a
      using errcode = 'P0002';
  end if;
  if op_b is null then
    raise exception 'swap_appointment_operators: appointment % not found or not visible to caller', p_b
      using errcode = 'P0002';
  end if;

  update appointment set operator_id = op_b where id = p_a;
  update appointment set operator_id = op_a where id = p_b;

  set constraints all immediate;
end
$$;

-- Measured (fix round 1): two concurrent swap_appointment_operators calls
-- that touch the SAME TWO clients in OPPOSITE roles — e.g. T1 swaps an
-- appointment belonging to client X's visit with one belonging to client
-- Y's, while T2 concurrently swaps a DIFFERENT pair of appointments that
-- also spans exactly X and Y — can deadlock: 25/60 trials, 40P01. The cause
-- is the same deferred zz_touch_client_activity constraint trigger described
-- in 0007_client_activity.sql: SET CONSTRAINTS ALL IMMEDIATE above forces it
-- to fire, and lock the two affected clients' rows, INSIDE this function, in
-- whatever order the two visits' client_ids happen to resolve in — this
-- function locks `appointment` rows (in id order), not `client` rows, so
-- there is no analogous fixed order over clients here to prevent it, unlike
-- the operator lockout guard's ORDER BY over `operator`. This is an
-- ACCEPTED outcome, not a defect: one or both transactions abort with
-- 40P01 rather than any appointment or client data ending up wrong, and the
-- application layer is expected to retry on 40P01, exactly as for the
-- lockout guard's own documented deadlock (0009_operator_guard.sql).

-- An exception day and its ranges in ONE transaction: two calls would mean a
-- request that hangs after the first leaves the operator marked away all day,
-- indistinguishable from a deliberate absence. Spec §6.5.
-- p_ranges is an N x 2 array of [start_boundary, end_boundary]; null OR EMPTY
-- means away.
create function public.write_exception_day(
  p_operator_id uuid,
  p_date        date,
  p_ranges      int[][]
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_day_id uuid;
  i integer;
  n integer;
begin
  delete from exception_day
  where operator_id = p_operator_id and exception_date = p_date;

  insert into exception_day (operator_id, exception_date)
  values (p_operator_id, p_date)
  returning id into v_day_id;

  -- array_length of an empty array is NULL, so this covers both the null and
  -- the empty case the comment above promises.
  n := coalesce(array_length(p_ranges, 1), 0);
  for i in 1 .. n loop
    insert into exception_range (exception_day_id, start_boundary, end_boundary)
    values (v_day_id, p_ranges[i][1], p_ranges[i][2]);
  end loop;

  return v_day_id;
end
$$;

-- Bulk absence over a date range. Spec §6.5: two weeks of holiday entered one
-- date at a time guarantees a missed day that leaves the operator bookable.
create function public.write_exception_days(
  p_operator_id uuid,
  p_from        date,
  p_to          date,
  p_ranges      int[][]
) returns integer
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  d date;
  written integer := 0;
begin
  for d in select generate_series(p_from, p_to, interval '1 day')::date loop
    perform write_exception_day(p_operator_id, d, p_ranges);
    written := written + 1;
  end loop;
  return written;
end
$$;

-- Supabase grants EXECUTE on new public functions to anon by default, and
-- swap_appointment_operators takes row locks BEFORE row-level security filters
-- anything: an unauthenticated caller could hold locks on appointment rows.
revoke execute on function
  public.move_visit(uuid, date, integer),
  public.swap_appointment_operators(uuid, uuid),
  public.write_exception_day(uuid, date, int[]),
  public.write_exception_days(uuid, date, date, int[])
from public, anon;

grant execute on function
  public.move_visit(uuid, date, integer),
  public.swap_appointment_operators(uuid, uuid),
  public.write_exception_day(uuid, date, int[]),
  public.write_exception_days(uuid, date, date, int[])
to authenticated;

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
  update visit set visit_date = p_new_date where id = p_visit_id;

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
  -- Ordered, for the same reason as the lockout guard.
  perform 1 from appointment where id in (p_a, p_b) order by id for update;

  select operator_id into op_a from appointment where id = p_a;
  select operator_id into op_b from appointment where id = p_b;

  update appointment set operator_id = op_b where id = p_a;
  update appointment set operator_id = op_a where id = p_b;

  set constraints all immediate;
end
$$;

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

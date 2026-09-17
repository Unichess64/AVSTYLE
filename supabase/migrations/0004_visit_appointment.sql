-- A visit groups the services of one trip to the salon. Spec §6.3, D23.

create table visit (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references client (id) on delete cascade,
  visit_date date not null,
  updated_at timestamptz not null default clock_timestamp(),
  unique (id, visit_date)
);

create table appointment (
  id               uuid primary key default gen_random_uuid(),
  visit_id         uuid not null,
  operator_id      uuid not null references operator (id),
  service_id       uuid not null references service (id),
  appointment_date date not null,
  start_cell       smallint not null check (start_cell between 0 and 287),
  cell_count       smallint not null check (cell_count > 0),
  updated_at       timestamptz not null default clock_timestamp(),

  constraint appointment_within_day check (start_cell + cell_count <= 288),

  -- The date is BOUND to the visit's. ON DELETE CASCADE is what makes a
  -- client's erasure executable: with NO ACTION, deleting a visit raised 23503
  -- and spec §11.3's promise described a failure.
  constraint appointment_visit_date_fk
    foreign key (visit_id, appointment_date)
    references visit (id, visit_date)
    on update cascade on delete cascade,

  unique (id, operator_id, appointment_date)
);

create index appointment_by_day on appointment (appointment_date, operator_id);
create index appointment_by_visit on appointment (visit_id);

-- security INVOKER: it only writes NEW, and elevating it would be gratuitous
-- in a schema whose Global Constraints make a point of definer discipline.
-- clock_timestamp(), not now(): now() is fixed for the transaction, so two
-- updates inside one transaction would compare equal.
create function app.touch_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end
$$;

create trigger appointment_touch before update on appointment
  for each row execute function app.touch_updated_at();
create trigger visit_touch before update on visit
  for each row execute function app.touch_updated_at();

alter table visit enable row level security;
alter table appointment enable row level security;

create policy visit_access on visit
  for all using (app.is_active_operator()) with check (app.is_active_operator());
create policy appointment_access on appointment
  for all using (app.is_active_operator()) with check (app.is_active_operator());

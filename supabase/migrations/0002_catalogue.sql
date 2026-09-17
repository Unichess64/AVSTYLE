-- Services, who performs them, and the salon's own hours. Spec §6.1.

create table service_category (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  integer not null default 0
);

create table service (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  category_id            uuid not null references service_category (id),
  default_duration_cells smallint not null check (default_duration_cells > 0),
  -- Turnaround AFTER this service. Advisory: applied when proposing
  -- (spec §7.3), never as occupancy.
  buffer_after_cells     smallint not null default 0 check (buffer_after_cells >= 0),
  is_active              boolean not null default true,
  sort_order             integer not null default 0
);

create table operator_service (
  operator_id    uuid not null references operator (id) on delete cascade,
  service_id     uuid not null references service (id) on delete cascade,
  -- NULL means "use service.default_duration_cells". Spec D28.
  duration_cells smallint check (duration_cells > 0),
  primary key (operator_id, service_id)
);

-- Bounds the agenda's vertical extent. Spec §6.1, §9.1.
-- `id boolean primary key check (id)` admits exactly one row.
create table salon_settings (
  id                  boolean primary key default true check (id),
  day_start_boundary  smallint not null check (day_start_boundary between 0 and 288),
  day_end_boundary    smallint not null check (day_end_boundary between 0 and 288),
  check (day_end_boundary > day_start_boundary)
);

insert into salon_settings (day_start_boundary, day_end_boundary) values (96, 240);

alter table service_category enable row level security;
alter table service enable row level security;
alter table operator_service enable row level security;
alter table salon_settings enable row level security;

create policy service_category_access on service_category
  for all using (app.is_active_operator()) with check (app.is_active_operator());
create policy service_access on service
  for all using (app.is_active_operator()) with check (app.is_active_operator());
create policy operator_service_access on operator_service
  for all using (app.is_active_operator()) with check (app.is_active_operator());
create policy salon_settings_access on salon_settings
  for all using (app.is_active_operator()) with check (app.is_active_operator());

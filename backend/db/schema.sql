create table timeslots (
  id serial primary key,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  slot_index smallint not null check (slot_index between 1 and 10),
  start_time time not null,
  end_time time not null,
  unique (day_of_week, slot_index)
);

alter table timeslots enable row level security;

grant select, insert, update, delete on timeslots to service_role;
grant usage, select on sequence timeslots_id_seq to service_role;

insert into timeslots (day_of_week, slot_index, start_time, end_time)
select d, s,
       time '08:30' + (s - 1) * interval '1 hour',
       time '08:30' + s * interval '1 hour'
from generate_series(1, 5) d, generate_series(1, 10) s;
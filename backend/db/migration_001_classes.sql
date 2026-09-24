-- Replace the one-group lessons model with combined classes and sessions.
-- Existing timetable data is test data only, so it is dropped.

drop table if exists timetable_entries cascade;
drop table if exists timetable_runs cascade;
drop table if exists lessons cascade;

create table classes (
  id serial primary key,
  code text not null unique,                 -- e.g. MAL2017
  module_name text not null,
  lecturer_id integer references lecturers(id) on delete set null,
  weekly_hours smallint not null default 4 check (weekly_hours between 1 and 20),
  session_length smallint not null default 2 check (session_length between 1 and 4),
  students smallint check (students > 0),    -- null = sum of the attending groups
  needs_lab boolean not null default false,
  created_at timestamptz not null default now()
);

create table class_groups (
  class_id integer not null references classes(id) on delete cascade,
  group_id integer not null references intake_groups(id) on delete cascade,
  primary key (class_id, group_id)
);

create index on class_groups (group_id);

create table sessions (
  id serial primary key,
  class_id integer not null references classes(id) on delete cascade,
  session_no smallint not null check (session_no > 0),
  hours smallint not null check (hours between 1 and 4),
  unique (class_id, session_no)
);

create table timetable_runs (
  id serial primary key,
  status text not null,
  penalty integer not null,
  engine text not null,
  solve_seconds numeric(6, 2),
  is_active boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create unique index one_active_run on timetable_runs (is_active) where is_active;

create table timetable_entries (
  id serial primary key,
  run_id integer not null references timetable_runs(id) on delete cascade,
  session_id integer not null references sessions(id) on delete cascade,
  room_id integer not null references rooms(id),
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_slot smallint not null check (start_slot between 1 and 10),
  hours smallint not null check (hours between 1 and 4),
  unique (run_id, session_id)
);

create index on timetable_entries (run_id);

alter table classes            enable row level security;
alter table class_groups       enable row level security;
alter table sessions           enable row level security;
alter table timetable_runs     enable row level security;
alter table timetable_entries  enable row level security;

grant select, insert, update, delete on
  classes, class_groups, sessions, timetable_runs, timetable_entries
  to service_role;

grant usage, select on all sequences in schema public to service_role;
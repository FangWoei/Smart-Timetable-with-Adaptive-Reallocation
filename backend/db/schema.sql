-- ============================================================
-- STAR database schema (PostgreSQL / Supabase)
-- Run top to bottom on a fresh database.
-- ============================================================

-- ---------- REFERENCE TABLE ----------

create table timeslots (
  id serial primary key,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  slot_index smallint not null check (slot_index between 1 and 10),
  start_time time not null,
  end_time time not null,
  unique (day_of_week, slot_index)
);

insert into timeslots (day_of_week, slot_index, start_time, end_time)
select d, s,
       time '08:30' + (s - 1) * interval '1 hour',
       time '08:30' + s * interval '1 hour'
from generate_series(1, 5) d, generate_series(1, 10) s;

-- ---------- INPUT TABLES ----------

create table rooms (
  id serial primary key,
  code text not null unique,
  capacity smallint not null check (capacity > 0),
  room_type text not null check (room_type in ('lecture', 'lab')),
  created_at timestamptz not null default now()
);

create table intake_groups (
  id serial primary key,
  code text not null unique,
  student_count smallint not null check (student_count > 0),
  programme text,
  intake text,
  created_at timestamptz not null default now()
);

create table lecturers (
  id serial primary key,
  name text not null unique,
  is_part_time boolean not null default false,
  created_at timestamptz not null default now()
);

create table lessons (
  id serial primary key,
  code text not null unique,
  module_name text not null,
  group_id integer not null references intake_groups(id) on delete cascade,
  lecturer_id integer references lecturers(id) on delete set null,
  hours smallint not null check (hours between 1 and 4),
  needs_lab boolean not null default false,
  created_at timestamptz not null default now()
);

create index on lessons (group_id);
create index on lessons (lecturer_id);

-- ---------- OUTPUT TABLES ----------

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
  lesson_id integer not null references lessons(id) on delete cascade,
  room_id integer not null references rooms(id),
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_slot smallint not null check (start_slot between 1 and 10),
  hours smallint not null check (hours between 1 and 4),
  unique (run_id, lesson_id)
);

create index on timetable_entries (run_id);

-- ---------- SECURITY ----------

alter table timeslots          enable row level security;
alter table rooms              enable row level security;
alter table intake_groups      enable row level security;
alter table lecturers          enable row level security;
alter table lessons            enable row level
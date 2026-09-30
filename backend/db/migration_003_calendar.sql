-- Semester dates (admin enters these each intake)
create table semesters (
  id serial primary key,
  code text not null unique,              -- e.g. 202609
  name text not null,                     -- e.g. September 2026
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

create unique index one_active_semester on semesters (is_active) where is_active;

-- Holidays and non-teaching days
create table holidays (
  id serial primary key,
  holiday_date date not null unique,
  name text not null,
  source text not null default 'manual' check (source in ('api', 'manual')),
  is_teaching_day boolean not null default false,   -- true = holiday but classes still run
  note text,
  created_at timestamptz not null default now()
);

create index on holidays (holiday_date);

alter table semesters enable row level security;
alter table holidays  enable row level security;

grant select, insert, update, delete on semesters, holidays to service_role;
grant usage, select on all sequences in schema public to service_role;
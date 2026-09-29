-- Invite-only access list. Being in Supabase Auth is not enough;
-- the email must also appear here, which is what grants access and role.

create table allowed_users (
  id serial primary key,
  email text not null unique check (email = lower(email)),
  role text not null check (role in ('admin', 'lecturer')),
  lecturer_id integer references lecturers(id) on delete set null,
  user_id uuid,                        -- filled on first successful sign-in
  last_login timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index on allowed_users (lecturer_id);

-- Who did what, for the security requirement
create table audit_log (
  id bigserial primary key,
  actor_email text,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index on audit_log (created_at desc);

alter table allowed_users enable row level security;
alter table audit_log     enable row level security;

grant select, insert, update, delete on allowed_users, audit_log to service_role;
grant usage, select on all sequences in schema public to service_role;

-- First admin
insert into allowed_users (email, role, note)
values ('bscs2509135@peninsulamalaysia.edu.my', 'admin', 'project owner');
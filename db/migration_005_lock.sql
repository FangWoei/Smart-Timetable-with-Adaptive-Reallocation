-- Locked entries are pinned: manual edits refuse to move them, and a
-- regenerate keeps them exactly where they are.
alter table timetable_entries
  add column is_locked boolean not null default false;

create index on timetable_entries (run_id, is_locked) where is_locked;
-- Rooms become managed records: editable, with status and outage windows.

alter table rooms
  add column name text,                       -- full name, e.g. "Neutron - Computer lab"
  add column status text not null default 'available'
    check (status in ('available', 'maintenance', 'out_of_service')),
  add column remarks text,
  add column unavailable_from date,
  add column unavailable_to date,
  add column is_deleted boolean not null default false,
  add constraint rooms_outage_dates
    check (unavailable_to is null or unavailable_from is null
           or unavailable_to >= unavailable_from);

-- classroom / lab (no 'hall' — the Capacity sheet only has these two)
alter table rooms drop constraint if exists rooms_room_type_check;
alter table rooms add constraint rooms_room_type_check
  check (room_type in ('lecture', 'lab'));

create index on rooms (status) where status <> 'available';
create index on rooms (is_deleted) where not is_deleted;
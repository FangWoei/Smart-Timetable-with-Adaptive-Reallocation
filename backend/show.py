from db.repository import get_client, get_active_timetable

tt = get_active_timetable(get_client())
if tt is None:
    print("No active timetable")
else:
    print(len(tt["entries"]), "sessions in run", tt["run"]["id"])
    for e in tt["entries"]:
        lock = " [LOCKED]" if e["locked"] else ""
        print(f'{e["entry_id"]:6} {e["class_code"]:9} day {e["day"]} slot {e["start_slot"]:2} -> {e["room"]}{lock}')

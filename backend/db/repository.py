import os

from dotenv import load_dotenv
from supabase import create_client
from datetime import date

from solver.engine import slot_time


def get_client():
    load_dotenv()
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"])


def _id_map(sb, table, key):
    rows = sb.table(table).select(f"id, {key}").execute().data
    return {r[key]: r["id"] for r in rows}


# ---------- WRITE INPUT DATA ----------
def seed(sb, data):
    """Load class-format data (like cs_sep2026.json) into the input tables."""
    rooms = [{"code": c, "capacity": r["cap"], "room_type": r["type"]}
             for c, r in data["rooms"].items()]
    sb.table("rooms").upsert(rooms, on_conflict="code").execute()

    groups = [{"code": c, "student_count": n} for c, n in data["groups"].items()]
    sb.table("intake_groups").upsert(groups, on_conflict="code").execute()

    names = sorted({c["lecturer"] for c in data["classes"] if c.get("lecturer")})
    sb.table("lecturers").upsert(
        [{"name": n, "is_part_time": n.startswith("PT")} for n in names],
        on_conflict="name",
    ).execute()

    lect_ids = _id_map(sb, "lecturers", "name")
    sb.table("classes").upsert([{
        "code": c["id"],
        "module_name": c["module"],
        "lecturer_id": lect_ids.get(c["lecturer"]),
        "weekly_hours": c.get("weekly_hours", 4),
        "session_length": c.get("session_length", 2),
        "students": c.get("students"),
        "needs_lab": c.get("lab", False),
    } for c in data["classes"]], on_conflict="code").execute()

    class_ids = _id_map(sb, "classes", "code")
    group_ids = _id_map(sb, "intake_groups", "code")

    links = [{"class_id": class_ids[c["id"]], "group_id": group_ids[g]}
             for c in data["classes"] for g in c["groups"]]
    sb.table("class_groups").upsert(links, on_conflict="class_id,group_id").execute()

    # Rebuild sessions from weekly_hours / session_length
    rows = []
    for c in data["classes"]:
        total = c.get("weekly_hours", 4)
        length = c.get("session_length", total)
        n = 1
        while total > 0:
            take = min(length, total)
            rows.append({"class_id": class_ids[c["id"]], "session_no": n, "hours": take})
            total -= take
            n += 1
    sb.table("sessions").upsert(rows, on_conflict="class_id,session_no").execute()


# ---------- READ INPUT FOR THE SOLVER ----------
def load_input(sb):
    """Read the input tables and return data in the solver's session format."""
    all_rooms = sb.table("rooms").select(ROOM_FIELDS).execute().data
    rooms = {r["code"]: {"cap": r["capacity"], "type": r["room_type"]}
             for r in all_rooms if room_is_open(r)}

    groups = {g["code"]: g["student_count"]
              for g in sb.table("intake_groups").select("code, student_count").execute().data}

    classes = sb.table("classes").select(
        "id, code, module_name, students, needs_lab, lecturers(name), "
        "class_groups(intake_groups(code))"
    ).execute().data
    by_class = {c["id"]: c for c in classes}

    rows = sb.table("sessions").select("id, class_id, session_no, hours").execute().data

    lessons = []
    for s in rows:
        c = by_class.get(s["class_id"])
        if c is None:
            continue
        attending = [g["intake_groups"]["code"] for g in c["class_groups"]]
        lessons.append({
            "id": str(s["id"]),                     # the session's database id
            "class_id": c["code"],
            "module": f"{c['module_name']} (part {s['session_no']})",
            "groups": attending,
            "students": c["students"],
            "lecturer": c["lecturers"]["name"] if c["lecturers"] else f"UNASSIGNED {c['code']}",
            "hours": s["hours"],
            "lab": c["needs_lab"],
        })

    return {"rooms": rooms, "groups": groups, "lessons": lessons}


# ---------- SAVE SOLVER OUTPUT ----------
def save_run(sb, result, engine, seconds, note=None):
    sb.table("timetable_runs").update({"is_active": False}).eq("is_active", True).execute()

    run = sb.table("timetable_runs").insert({
        "status": result["status"],
        "penalty": int(round(result["penalty"])),
        "engine": engine,
        "solve_seconds": round(seconds, 2),
        "is_active": True,
        "note": note,
    }).execute().data[0]

    room_ids = _id_map(sb, "rooms", "code")
    sb.table("timetable_entries").insert([{
        "run_id": run["id"],
        "session_id": int(e["lesson_id"]),
        "room_id": room_ids[e["room"]],
        "day_of_week": e["day"],
        "start_slot": e["start_slot"],
        "hours": e["hours"],
    } for e in result["entries"]]).execute()

    return run["id"]


# ---------- READ OUTPUT ----------
def list_runs(sb):
    return (sb.table("timetable_runs")
              .select("id, status, penalty, engine, solve_seconds, is_active, note, created_at")
              .order("id", desc=True)
              .execute().data)


def get_active_timetable(sb):
    runs = (sb.table("timetable_runs")
              .select("id, status, penalty, engine, created_at")
              .eq("is_active", True)
              .execute().data)
    if not runs:
        return None
    run = runs[0]

    rows = sb.table("timetable_entries").select(
        "id, is_locked, day_of_week, start_slot, hours, rooms(code), "
        "sessions(id, session_no, classes(code, module_name, lecturers(name), "
        "class_groups(intake_groups(code))))"
    ).eq("run_id", run["id"]).execute().data

    entries = []
    for r in rows:
        s = r["sessions"]
        c = s["classes"]
        start = r["start_slot"] - 1
        entries.append({
            "entry_id": r["id"],
            "locked": r["is_locked"],
            "session_id": str(s["id"]),
            "class_code": c["code"],
            "session_no": s["session_no"],
            "module": f"{c['module_name']} (part {s['session_no']})",
            "groups": sorted(g["intake_groups"]["code"] for g in c["class_groups"]),
            "lecturer": c["lecturers"]["name"] if c["lecturers"] else None,
            "room": r["rooms"]["code"],
            "day": r["day_of_week"],
            "start_slot": r["start_slot"],
            "hours": r["hours"],
            "start_time": slot_time(start),
            "end_time": slot_time(start + r["hours"]),
        })
    entries.sort(key=lambda e: (e["groups"][0], e["day"], e["start_slot"]))
    return {"run": run, "entries": entries}

def list_groups(sb):
    return (sb.table("intake_groups")
              .select("code, student_count, programme, intake")
              .order("code")
              .execute().data)

# ---------- MANUAL EDIT ----------
def get_entry(sb, entry_id):
    """One timetable entry, or None if it doesn't exist."""
    rows = (sb.table("timetable_entries")
              .select("id, run_id, session_id, room_id, day_of_week, start_slot, hours, is_locked")
              .eq("id", entry_id).execute().data)
    return rows[0] if rows else None


def move_entry(sb, entry_id, day, start_slot, room_code):
    """Change where and when one class happens."""
    room_ids = _id_map(sb, "rooms", "code")
    if room_code not in room_ids:
        raise ValueError(f"Unknown room {room_code}")
    return (sb.table("timetable_entries")
              .update({"day_of_week": day,
                       "start_slot": start_slot,
                       "room_id": room_ids[room_code]})
              .eq("id", entry_id).execute().data[0])


def set_lock(sb, entry_id, locked):
    """Lock or unlock one class."""
    return (sb.table("timetable_entries")
              .update({"is_locked": locked})
              .eq("id", entry_id).execute().data[0])


def get_pins(sb):
    """Locked classes of the active run, so the solver can keep them in place."""
    runs = sb.table("timetable_runs").select("id").eq("is_active", True).execute().data
    if not runs:
        return {}
    rows = (sb.table("timetable_entries")
              .select("session_id, day_of_week, start_slot, rooms(code)")
              .eq("run_id", runs[0]["id"]).eq("is_locked", True).execute().data)
    return {str(r["session_id"]): {"day": r["day_of_week"],
                                   "start_slot": r["start_slot"],
                                   "room": r["rooms"]["code"]} for r in rows}


def log_action(sb, action, detail=None, actor=None):
    """Record what happened. Never raises — logging must not break a request."""
    try:
        sb.table("audit_log").insert({
            "actor_email": actor, "action": action, "detail": detail,
        }).execute()
    except Exception:
        pass

ROOM_FIELDS = ("id, code, name, capacity, room_type, status, remarks, "
               "unavailable_from, unavailable_to, is_deleted")


def list_rooms(sb, include_deleted=False):
    q = sb.table("rooms").select(ROOM_FIELDS).order("code")
    if not include_deleted:
        q = q.eq("is_deleted", False)
    return q.execute().data


def get_room(sb, room_id):
    rows = sb.table("rooms").select(ROOM_FIELDS).eq("id", room_id).execute().data
    return rows[0] if rows else None


def create_room(sb, data):
    return sb.table("rooms").insert(data).execute().data[0]


def update_room(sb, room_id, data):
    rows = sb.table("rooms").update(data).eq("id", room_id).execute().data
    return rows[0] if rows else None


def soft_delete_room(sb, room_id):
    """Hide a room without breaking past timetables that reference it."""
    rows = (sb.table("rooms").update({"is_deleted": True, "status": "out_of_service"})
              .eq("id", room_id).execute().data)
    return rows[0] if rows else None


def room_is_open(room, on=None):
    """True if the room can be scheduled on a given date."""
    if room["is_deleted"]:
        return False
    if room["status"] == "available":
        return True
    on = on or date.today()
    start, end = room["unavailable_from"], room["unavailable_to"]
    if not start and not end:
        return False                       # unavailable indefinitely
    if start and on < date.fromisoformat(start):
        return True                        # outage hasn't started
    if end and on > date.fromisoformat(end):
        return True                        # outage finished
    return False


def entries_in_room(sb, room_id):
    """Active-run classes currently placed in one room."""
    runs = sb.table("timetable_runs").select("id").eq("is_active", True).execute().data
    if not runs:
        return []
    return (sb.table("timetable_entries")
              .select("id, session_id, day_of_week, start_slot, hours, "
                      "sessions(classes(code, module_name))")
              .eq("run_id", runs[0]["id"]).eq("room_id", room_id).execute().data)
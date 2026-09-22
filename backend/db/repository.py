import os

from dotenv import load_dotenv
from supabase import create_client


def get_client():
    load_dotenv()
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"])


def _id_map(sb, table, key):
    """Return {code: id} for a table, e.g. {'R101': 1, 'R102': 2}."""
    rows = sb.table(table).select(f"id, {key}").execute().data
    return {r[key]: r["id"] for r in rows}


# ---------- WRITE INPUT DATA ----------
def seed(sb, data):
    """Load solver-format data (like mock.json) into the input tables."""
    rooms = [{"code": code, "capacity": r["cap"], "room_type": r["type"]}
             for code, r in data["rooms"].items()]
    sb.table("rooms").upsert(rooms, on_conflict="code").execute()

    groups = [{"code": code, "student_count": n} for code, n in data["groups"].items()]
    sb.table("intake_groups").upsert(groups, on_conflict="code").execute()

    names = sorted({l["lecturer"] for l in data["lessons"] if l.get("lecturer")})
    lecturers = [{"name": n, "is_part_time": n.startswith("PT")} for n in names]
    sb.table("lecturers").upsert(lecturers, on_conflict="name").execute()

    group_ids = _id_map(sb, "intake_groups", "code")
    lect_ids = _id_map(sb, "lecturers", "name")
    lessons = [{
        "code": l["id"],
        "module_name": l["module"],
        "group_id": group_ids[l["group"]],
        "lecturer_id": lect_ids.get(l["lecturer"]),
        "hours": l["hours"],
        "needs_lab": l["lab"],
    } for l in data["lessons"]]
    sb.table("lessons").upsert(lessons, on_conflict="code").execute()


# ---------- READ INPUT FOR THE SOLVER ----------
def load_input(sb):
    """Read the input tables and return data in the solver's format."""
    rooms = {r["code"]: {"cap": r["capacity"], "type": r["room_type"]}
             for r in sb.table("rooms").select("code, capacity, room_type").execute().data}

    groups = {g["code"]: g["student_count"]
              for g in sb.table("intake_groups").select("code, student_count").execute().data}

    rows = sb.table("lessons").select(
        "code, module_name, hours, needs_lab, intake_groups(code), lecturers(name)"
    ).execute().data

    lessons = []
    for r in rows:
        if r["lecturers"]:
            lecturer = r["lecturers"]["name"]
        else:
            lecturer = f"UNASSIGNED {r['code']}"   # unique, so no false clashes
        lessons.append({
            "id": r["code"],
            "module": r["module_name"],
            "group": r["intake_groups"]["code"],
            "lecturer": lecturer,
            "hours": r["hours"],
            "lab": r["needs_lab"],
        })

    return {"rooms": rooms, "groups": groups, "lessons": lessons}


# ---------- SAVE SOLVER OUTPUT ----------
def save_run(sb, result, engine, seconds, note=None):
    """Store a solver result as a new active timetable run. Returns the run id."""
    sb.table("timetable_runs").update({"is_active": False}).eq("is_active", True).execute()

    run = sb.table("timetable_runs").insert({
        "status": result["status"],
        "penalty": int(round(result["penalty"])),
        "engine": engine,
        "solve_seconds": round(seconds, 2),
        "is_active": True,
        "note": note,
    }).execute().data[0]

    lesson_ids = _id_map(sb, "lessons", "code")
    room_ids = _id_map(sb, "rooms", "code")
    entries = [{
        "run_id": run["id"],
        "lesson_id": lesson_ids[e["lesson_id"]],
        "room_id": room_ids[e["room"]],
        "day_of_week": e["day"],
        "start_slot": e["start_slot"],
        "hours": e["hours"],
    } for e in result["entries"]]
    sb.table("timetable_entries").insert(entries).execute()

    return run["id"]
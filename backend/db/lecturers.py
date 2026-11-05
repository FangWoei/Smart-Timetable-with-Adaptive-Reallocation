"""Lecturers: list, full-time / part-time, availability and teaching hours."""
from db.calendar import dated_timetable


def list_lecturers(sb):
    lecturers = sb.table("lecturers").select("id, name, is_part_time").order("name").execute().data
    emails = {r["lecturer_id"]: r["email"]
              for r in sb.table("allowed_users").select("lecturer_id, email").execute().data
              if r["lecturer_id"]}
    classes = sb.table("classes").select("lecturer_id, module_name, weekly_hours").execute().data

    out = []
    for lec in lecturers:
        mine = [c for c in classes if c["lecturer_id"] == lec["id"]]
        out.append({
            "id": lec["id"],
            "name": lec["name"],
            "email": emails.get(lec["id"]),
            "is_part_time": lec["is_part_time"],
            "assigned_hours": sum(c["weekly_hours"] for c in mine),
            "subjects": sorted({c["module_name"] for c in mine}),
        })
    return out


def add_lecturer(sb, name, is_part_time=False):
    """Create a lecturer row. Names are unique, so a duplicate is refused."""
    name = " ".join(name.split())
    if not name:
        raise ValueError("Name is required")
    if sb.table("lecturers").select("id").eq("name", name).execute().data:
        raise ValueError("A lecturer with this name already exists")
    return sb.table("lecturers").insert(
        {"name": name, "is_part_time": is_part_time}).execute().data[0]


def remove_lecturer(sb, lecturer_id):
    """Delete a lecturer. Their classes/lessons keep existing with no lecturer."""
    rows = sb.table("lecturers").delete().eq("id", lecturer_id).execute().data
    return rows[0] if rows else None


def get_lecturer(sb, lecturer_id):
    rows = sb.table("lecturers").select("id, name, is_part_time").eq("id", lecturer_id).execute().data
    return rows[0] if rows else None


def set_part_time(sb, lecturer_id, is_part_time):
    rows = (sb.table("lecturers").update({"is_part_time": is_part_time})
              .eq("id", lecturer_id).execute().data)
    return rows[0] if rows else None


def get_unavailable(sb, lecturer_id):
    rows = (sb.table("lecturer_unavailable").select("day, slot")
              .eq("lecturer_id", lecturer_id).execute().data)
    return sorted([r["day"], r["slot"]] for r in rows)


def set_unavailable(sb, lecturer_id, cells):
    """Replace this lecturer's blocked times. cells = [[day, slot], ...]."""
    clean = set()
    for cell in cells:
        if len(cell) != 2:
            raise ValueError("Each time must be [day, slot]")
        day, slot = cell
        if not (1 <= day <= 5 and 1 <= slot <= 10):
            raise ValueError(f"Day must be 1-5 and slot 1-10 (got {day}, {slot})")
        clean.add((day, slot))

    sb.table("lecturer_unavailable").delete().eq("lecturer_id", lecturer_id).execute()
    if clean:
        sb.table("lecturer_unavailable").insert(
            [{"lecturer_id": lecturer_id, "day": d, "slot": s} for d, s in sorted(clean)]
        ).execute()
    return sorted([d, s] for d, s in clean)


def load_unavailable(sb):
    """{lecturer name: [[day, slot], ...]} in the format the solver reads."""
    rows = sb.table("lecturer_unavailable").select("day, slot, lecturers(name)").execute().data
    out = {}
    for r in rows:
        if r["lecturers"]:
            out.setdefault(r["lecturers"]["name"], []).append([r["day"], r["slot"]])
    return out


def teaching_hours(entries, semester=None, holidays_rows=()):
    """Hours per weekday, per normal week, and per calendar month of the semester.

    Months count real dates, so public holidays (no classes) are left out.
    """
    per_day = {d: 0 for d in range(1, 6)}
    for e in entries:
        per_day[e["day"]] += e["hours"]

    per_month = {}
    if semester:
        for row in dated_timetable(entries, semester, holidays_rows):
            if row["holiday"]:
                continue
            month = row["date"][:7]
            per_month[month] = per_month.get(month, 0) + row["hours"]

    return {
        "per_day": per_day,
        "per_week": sum(per_day.values()),
        "per_month": per_month,
        "semester_total": sum(per_month.values()),
    }
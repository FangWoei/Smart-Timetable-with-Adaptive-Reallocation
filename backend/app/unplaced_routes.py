"""Lessons that are in the database but not on the timetable (yet).

A lesson is "unplaced" when its session has no entry in the active run. That
happens when classes are imported after the last generate, or when the admin
takes a lesson off the grid (POST /timetable/entries/{id}/unplace).
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.deps import get_sb
from db.repository import (
    _id_map, get_active_timetable, get_entry, load_input, log_action,
)
from solver import engine_v2
from solver.checker import check
from solver.engine import SolverError

router = APIRouter()


class PlaceIn(BaseModel):
    day: int = Field(ge=1, le=5)
    start_slot: int = Field(ge=1, le=10)
    room: str = Field(min_length=1, max_length=80)
    force: bool = False


# ---------- small DB helpers (tests replace these) ----------
def _insert_entry(sb, run_id, lesson, day, start_slot, room_code):
    room_ids = _id_map(sb, "rooms", "code")
    if room_code not in room_ids:
        raise ValueError(f"Unknown room {room_code}")
    return sb.table("timetable_entries").insert({
        "run_id": run_id,
        "session_id": int(lesson["id"]),
        "room_id": room_ids[room_code],
        "day_of_week": day,
        "start_slot": start_slot,
        "hours": lesson["hours"],
    }).execute().data[0]


def _delete_entry(sb, entry_id):
    sb.table("timetable_entries").delete().eq("id", entry_id).execute()


# ---------- logic ----------
def check_partial(data, entries):
    """Like check(), but only for the lessons that are in `entries`
    (check() alone complains about every lesson that is not on the timetable)."""
    ids = {e["lesson_id"] for e in entries}
    return check({**data, "lessons": [l for l in data["lessons"] if l["id"] in ids]}, entries)


def card(l):
    """One lesson in the shape the frontend's 'Unplaced' panel shows."""
    lecturer = None if l["lecturer"].startswith("UNASSIGNED") else l["lecturer"]
    return {
        "id": l["id"],
        "session_id": l["id"],
        "entry_id": None,
        "class_code": l["class_id"],
        "module": l["module"],
        "hours": l["hours"],
        "groups": sorted(l["groups"]),
        "lecturer": lecturer,
        "needs_lab": bool(l["lab"]),
    }


def find_unplaced(sb, data=None, tt=None):
    """(active timetable, input data, list of lessons with no entry)."""
    tt = tt or get_active_timetable(sb)
    if tt is None:
        raise HTTPException(404, "No active timetable yet. Generate one first.")
    data = data or load_input(sb)
    placed = {e["session_id"] for e in tt["entries"]}
    return tt, data, [l for l in data["lessons"] if l["id"] not in placed]


def unplaced_cards(sb, group=None, lecturer=None, tt=None):
    _, _, lessons = find_unplaced(sb, tt=tt)
    cards = [card(l) for l in lessons]
    if group:
        cards = [c for c in cards if group in c["groups"]]
    if lecturer:
        cards = [c for c in cards if c["lecturer"] == lecturer]
    cards.sort(key=lambda c: (c["groups"][:1], c["class_code"], c["module"]))
    return cards


def _as_check_entries(tt):
    return [{"lesson_id": e["session_id"], "room": e["room"],
             "day": e["day"], "start_slot": e["start_slot"]} for e in tt["entries"]]


def _try_place(data, tt_entries, free, time_limit):
    """Solve for `free` lessons while every already-placed lesson stays put.
    Returns the new entries, or None if they do not fit."""
    free_ids = {l["id"] for l in free}
    placed_ids = {e["lesson_id"] for e in tt_entries}
    sub = {
        **data,
        "lessons": [l for l in data["lessons"] if l["id"] in free_ids | placed_ids],
        "pinned": {e["lesson_id"]: {"day": e["day"], "start_slot": e["start_slot"],
                                    "room": e["room"]} for e in tt_entries},
    }
    try:
        result = engine_v2.solve(sub, time_limit=time_limit)
    except SolverError:
        return None
    new = [e for e in result["entries"] if e["lesson_id"] in free_ids]
    if check(sub, tt_entries + new):
        return None
    return new


def auto_place(sb, time_limit=10):
    tt, data, lessons = find_unplaced(sb)
    run_id = tt["run"]["id"]
    current = _as_check_entries(tt)
    if not lessons:
        return {"placed": 0, "unplaced": 0, "placed_ids": [], "still_unplaced": []}

    batch = _try_place(data, current, lessons, time_limit)
    if batch is not None:
        new_entries, left = batch, []
    else:
        # They do not all fit together: place them one by one, keep what fits.
        new_entries, left = [], []
        for l in lessons:
            one = _try_place(data, current + new_entries, [l], time_limit)
            if one is None:
                left.append(l)
            else:
                new_entries += one

    by_id = {l["id"]: l for l in lessons}
    for e in new_entries:
        _insert_entry(sb, run_id, by_id[e["lesson_id"]], e["day"], e["start_slot"], e["room"])
    log_action(sb, "auto_place_unplaced",
               {"placed": len(new_entries), "left": len(left), "run_id": run_id})
    return {
        "placed": len(new_entries),
        "unplaced": len(left),
        "placed_ids": [e["lesson_id"] for e in new_entries],
        "still_unplaced": [card(l) for l in left],
    }


# ---------- routes ----------
@router.get("/timetable/unplaced")
def read_unplaced(group: str | None = None, lecturer: str | None = None, sb=Depends(get_sb)):
    """Lessons that have no slot in the active timetable."""
    cards = unplaced_cards(sb, group, lecturer)
    return {"count": len(cards), "unplaced": cards}


@router.post("/timetable/unplaced/auto-place")
def auto_place_all(time_limit: float = 10, sb=Depends(get_sb)):
    """Put every unplaced lesson into the timetable without moving anything else."""
    if not 0 < time_limit <= 60:
        raise HTTPException(400, "time_limit must be between 0 and 60 seconds")
    return auto_place(sb, time_limit)


@router.post("/timetable/unplaced/{session_id}/place")
def place_one(session_id: str, m: PlaceIn, sb=Depends(get_sb)):
    """Drop one unplaced lesson on the grid. Rejected on a clash unless force=true."""
    tt, data, lessons = find_unplaced(sb)
    lesson = next((l for l in lessons if l["id"] == session_id), None)
    if lesson is None:
        raise HTTPException(404, "That lesson is not in the unplaced list.")

    proposed = _as_check_entries(tt) + [{
        "lesson_id": session_id, "room": m.room, "day": m.day, "start_slot": m.start_slot}]
    problems = check_partial(data, proposed)
    if problems and not m.force:
        return {"saved": False, "valid": False, "problems": problems}

    try:
        row = _insert_entry(sb, tt["run"]["id"], lesson, m.day, m.start_slot, m.room)
    except ValueError as e:
        raise HTTPException(400, str(e))
    log_action(sb, "place_unplaced", {"session_id": session_id, "forced": bool(problems),
                                      "to": {"day": m.day, "slot": m.start_slot, "room": m.room}})
    return {"saved": True, "valid": not problems, "problems": problems, "entry_id": row["id"]}


@router.post("/timetable/entries/{entry_id}/unplace")
def unplace(entry_id: int, sb=Depends(get_sb)):
    """Take a lesson off the grid; it goes back to the unplaced list."""
    entry = get_entry(sb, entry_id)
    if entry is None:
        raise HTTPException(404, "Entry not found")
    if entry["is_locked"]:
        raise HTTPException(409, "This class is locked. Unlock it first.")
    _delete_entry(sb, entry_id)
    log_action(sb, "unplace_entry", {"entry_id": entry_id, "session_id": entry["session_id"]})
    return {"entry_id": entry_id, "session_id": str(entry["session_id"]), "unplaced": True}
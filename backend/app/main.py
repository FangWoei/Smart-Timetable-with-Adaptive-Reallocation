import tempfile
import time
from functools import lru_cache
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from db.calendar import (
    add_holiday, delete_holiday, list_holidays, list_semesters,
    save_semester, sync_holidays,
)

from db.repository import (
    apply_moves, create_room, entries_in_room, get_active_timetable, get_client,
    get_entry, get_pins, get_room, list_groups, list_rooms, list_runs,
    load_input, log_action, move_entry, save_run, seed, set_lock,
    soft_delete_room, update_room,
)

from importer.reader import parse_any as parse
from importer.run_import import PLACEHOLDER_ROOMS
from solver import engine as engine_v1
from solver import engine_v2
from solver.checker import check
from solver.engine import SolverError
from solver.reallocate import reallocate

ENGINES = {"engine": engine_v1, "engine_v2": engine_v2}
MAX_UPLOAD_BYTES = 2 * 1024 * 1024        # 2 MB is plenty for a course listing

class HolidayIn(BaseModel):
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    name: str = Field(min_length=1, max_length=120)
    is_teaching_day: bool = False
    note: str | None = Field(default=None, max_length=300)


class SemesterIn(BaseModel):
    code: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=60)
    start_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")

class MoveIn(BaseModel):
    day: int = Field(ge=1, le=5)
    start_slot: int = Field(ge=1, le=10)
    room: str = Field(min_length=1, max_length=80)
    force: bool = False


class LockIn(BaseModel):
    locked: bool

class RoomIn(BaseModel):
    code: str = Field(min_length=1, max_length=80)
    name: str | None = Field(default=None, max_length=120)
    capacity: int = Field(ge=1, le=1000)
    room_type: Literal["lecture", "lab"]
    remarks: str | None = Field(default=None, max_length=300)


class RoomStatusIn(BaseModel):
    status: Literal["available", "maintenance", "out_of_service"]
    remarks: str | None = Field(default=None, max_length=300)
    unavailable_from: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    unavailable_to: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")

app = FastAPI(
    title="STAR API",
    description="Smart Timetable with Adaptive Reallocation",
    version="0.1.0",
)

# Allow the React dev server (Vite) to call this API from the browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@lru_cache
def get_sb():
    """One shared Supabase client for all requests."""
    return get_client()


# ---------- REQUEST SHAPES ----------
class EntryIn(BaseModel):
    lesson_id: str
    room: str
    day: int = Field(ge=1, le=5, description="1 = Monday ... 5 = Friday")
    start_slot: int = Field(ge=1, le=10, description="1 = 08:30 ... 10 = 17:30")


class CheckRequest(BaseModel):
    entries: list[EntryIn]


# ---------- HELPERS ----------
async def _parse_upload(file: UploadFile):
    """Save the upload to a temp file, parse it, then delete it."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Please upload a .csv file")

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(400, "File is too large (max 2 MB)")

    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
        tmp.write(raw)
        path = Path(tmp.name)
    try:
        return parse(path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(422, f"Could not read this CSV: {e}")
    finally:
        path.unlink(missing_ok=True)


# ---------- TIMETABLE ----------
@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/timetable")
def read_timetable(group: str | None = None, lecturer: str | None = None,
                   sb=Depends(get_sb)):
    """The active timetable. Optionally filter by group code or lecturer name."""
    tt = get_active_timetable(sb)
    if tt is None:
        raise HTTPException(404, "No active timetable yet. Generate one first.")

    entries = tt["entries"]
    if group:
        entries = [e for e in entries if group in e["groups"]]
    if lecturer:
        entries = [e for e in entries if e["lecturer"] == lecturer]
    return {"run": tt["run"], "entries": entries}


@app.get("/runs")
def read_runs(sb=Depends(get_sb)):
    """Every timetable generated so far, newest first."""
    return list_runs(sb)


@app.post("/timetable/generate", status_code=201)
def generate(engine: Literal["engine", "engine_v2"] = "engine_v2",
             time_limit: float = 30, respect_locks: bool = True, sb=Depends(get_sb)):
    """Run the AI solver on the current data and save it as the active timetable."""
    if not 0 < time_limit <= 120:
        raise HTTPException(400, "time_limit must be between 0 and 120 seconds")

    data = load_input(sb)
    if respect_locks:
        data["pinned"] = get_pins(sb)
    if not data["lessons"]:
        raise HTTPException(400, "No lessons in the database. Import data first.")

    start = time.perf_counter()
    try:
        result = ENGINES[engine].solve(data, time_limit=time_limit)
    except SolverError as e:
        raise HTTPException(422, str(e))
    seconds = time.perf_counter() - start

    problems = check(data, result["entries"])
    if problems:
        raise HTTPException(500, {"message": "Checker rejected the timetable",
                                  "problems": problems})

    run_id = save_run(sb, result, engine, seconds)
    return {
        "run_id": run_id,
        "status": result["status"],
        "penalty": result["penalty"],
        "seconds": round(seconds, 2),
        "classes": len(result["entries"]),
    }


@app.post("/timetable/check")
def check_timetable(req: CheckRequest, sb=Depends(get_sb)):
    """Check a full (possibly hand-edited) timetable for clashes and rule breaks."""
    data = load_input(sb)
    problems = check(data, [e.model_dump() for e in req.entries])
    return {"valid": not problems, "problems": problems}


# ---------- IMPORT ----------
@app.post("/import/preview")
async def import_preview(file: UploadFile = File(...)):
    """Parse a Course Listing CSV and show what would be imported."""
    result = await _parse_upload(file)
    return {
        "groups": result["groups"],
        "classes": result["classes"],
        "skipped": [{"group": g, "code": c} for g, c in result["skipped"]],
        "warnings": result.get("warnings", []),
    }


@app.post("/import/commit", status_code=201)
async def import_commit(file: UploadFile = File(...), sb=Depends(get_sb)):
    """Parse the CSV and write it into the database."""
    result = await _parse_upload(file)
    if not result["classes"]:
        raise HTTPException(400, "No classes found in this file")

    seed(sb, {
        "rooms": PLACEHOLDER_ROOMS,
        "groups": result["groups"],
        "classes": [{k: v for k, v in c.items() if k != "part_time"}
                    for c in result["classes"]],
    })
    return {
        "groups": len(result["groups"]),
        "classes": len(result["classes"]),
        "warnings": result.get("warnings", []),
    }

@app.post("/holidays/sync")
def sync(year: int, state: str = "PNG", sb=Depends(get_sb)):
    if not 2020 <= year <= 2100:
        raise HTTPException(400, "year out of range")
    try:
        return sync_holidays(sb, year, state)
    except Exception as e:
        raise HTTPException(500, f"Could not generate holidays: {e}")

@app.get("/holidays")
def read_holidays(start: str | None = None, end: str | None = None, sb=Depends(get_sb)):
    return list_holidays(sb, start, end)


@app.post("/holidays", status_code=201)
def create_holiday(h: HolidayIn, sb=Depends(get_sb)):
    return add_holiday(sb, h.date, h.name, h.is_teaching_day, h.note)


@app.delete("/holidays/{date}", status_code=204)
def remove_holiday(date: str, sb=Depends(get_sb)):
    delete_holiday(sb, date)


@app.get("/semesters")
def read_semesters(sb=Depends(get_sb)):
    return list_semesters(sb)


@app.post("/semesters", status_code=201)
def create_semester(s: SemesterIn, sb=Depends(get_sb)):
    if s.end_date <= s.start_date:
        raise HTTPException(400, "end_date must be after start_date")
    return save_semester(sb, s.code, s.name, s.start_date, s.end_date)

@app.get("/groups")
def read_groups(sb=Depends(get_sb)):
    """All intake groups with their student counts."""
    return list_groups(sb)

# ---------- MANUAL EDIT ----------
@app.patch("/timetable/entries/{entry_id}")
def move(entry_id: int, m: MoveIn, sb=Depends(get_sb)):
    """Move one class. Rejected if it creates a conflict, unless force=true."""
    entry = get_entry(sb, entry_id)
    if entry is None:
        raise HTTPException(404, "Entry not found")
    if entry["is_locked"]:
        raise HTTPException(409, "This class is locked. Unlock it first.")

    tt = get_active_timetable(sb)
    if tt is None:
        raise HTTPException(404, "No active timetable")

    proposed = [{
        "lesson_id": e["session_id"],
        "room": m.room if e["entry_id"] == entry_id else e["room"],
        "day": m.day if e["entry_id"] == entry_id else e["day"],
        "start_slot": m.start_slot if e["entry_id"] == entry_id else e["start_slot"],
    } for e in tt["entries"]]

    data = load_input(sb)
    problems = check(data, proposed)

    if problems and not m.force:
        return {"saved": False, "valid": False, "problems": problems}

    try:
        move_entry(sb, entry_id, m.day, m.start_slot, m.room)
    except ValueError as e:
        raise HTTPException(400, str(e))

    log_action(sb, "move_entry", {
        "entry_id": entry_id,
        "to": {"day": m.day, "slot": m.start_slot, "room": m.room},
        "forced": bool(problems),
    })
    return {"saved": True, "valid": not problems, "problems": problems}


@app.post("/timetable/entries/{entry_id}/lock")
def lock(entry_id: int, body: LockIn, sb=Depends(get_sb)):
    """Lock or unlock a class so it can't be moved or re-solved."""
    if get_entry(sb, entry_id) is None:
        raise HTTPException(404, "Entry not found")
    row = set_lock(sb, entry_id, body.locked)
    log_action(sb, "lock_entry" if body.locked else "unlock_entry", {"entry_id": entry_id})
    return {"entry_id": entry_id, "locked": row["is_locked"]}

# ---------- ROOMS ----------
@app.get("/rooms")
def read_rooms(include_deleted: bool = False, sb=Depends(get_sb)):
    return list_rooms(sb, include_deleted)


@app.post("/rooms", status_code=201)
def add_room(r: RoomIn, sb=Depends(get_sb)):
    try:
        row = create_room(sb, r.model_dump())
    except Exception as e:
        raise HTTPException(400, f"Could not create room: {e}")
    log_action(sb, "create_room", {"code": r.code})
    return row


@app.patch("/rooms/{room_id}")
def edit_room(room_id: int, r: RoomIn, sb=Depends(get_sb)):
    row = update_room(sb, room_id, r.model_dump())
    if row is None:
        raise HTTPException(404, "Room not found")
    log_action(sb, "update_room", {"room_id": room_id})
    return row


@app.patch("/rooms/{room_id}/status")
def set_room_status(room_id: int, s: RoomStatusIn, sb=Depends(get_sb)):
    """Mark a room unavailable (or available again) and see what it affects."""
    room = get_room(sb, room_id)
    if room is None:
        raise HTTPException(404, "Room not found")
    if s.unavailable_to and s.unavailable_from and s.unavailable_to < s.unavailable_from:
        raise HTTPException(400, "unavailable_to must be on or after unavailable_from")

    affected = entries_in_room(sb, room_id) if s.status != "available" else []
    row = update_room(sb, room_id, s.model_dump())
    log_action(sb, "room_status", {
        "room_id": room_id, "status": s.status, "affected": len(affected),
    })
    return {
        "room": row,
        "affected_classes": [{
            "entry_id": e["id"],
            "code": e["sessions"]["classes"]["code"],
            "module": e["sessions"]["classes"]["module_name"],
            "day": e["day_of_week"],
            "start_slot": e["start_slot"],
        } for e in affected],
    }


@app.delete("/rooms/{room_id}", status_code=200)
def remove_room(room_id: int, sb=Depends(get_sb)):
    row = soft_delete_room(sb, room_id)
    if row is None:
        raise HTTPException(404, "Room not found")
    log_action(sb, "delete_room", {"room_id": room_id})
    return {"deleted": True, "room": row}

# ---------- ADAPTIVE REALLOCATION ----------
@app.post("/rooms/{room_id}/reallocate")
def reallocate_room(room_id: int, apply: bool = False, sb=Depends(get_sb)):
    """Find replacement rooms for classes in an unavailable room.

    Times never change. Set apply=true to save the result.
    """
    room = get_room(sb, room_id)
    if room is None:
        raise HTTPException(404, "Room not found")

    tt = get_active_timetable(sb)
    if tt is None:
        raise HTTPException(404, "No active timetable")

    affected = [e["session_id"] for e in tt["entries"] if e["room"] == room["code"]]
    if not affected:
        return {"room": room["code"], "affected": 0, "moves": [], "unresolved": []}

    data = load_input(sb)                       # excludes unavailable rooms
    try:
        result = reallocate(data, tt["entries"], affected)
    except SolverError as e:
        raise HTTPException(422, str(e))

    if apply and result["moves"]:
        apply_moves(sb, result["moves"])
        log_action(sb, "reallocate", {
            "room": room["code"], "moved": len(result["moves"]),
            "unresolved": result["unresolved"],
        })

    return {
        "room": room["code"],
        "affected": len(affected),
        "applied": bool(apply and result["moves"]),
        "moves": result["moves"],
        "unresolved": result["unresolved"],
    }
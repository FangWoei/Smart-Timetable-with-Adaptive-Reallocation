# ============================================================
# STAR API
# Smart Timetable with Adaptive Reallocation
# ============================================================


# ------------------------------------------------------------
# 1. PYTHON STANDARD LIBRARIES
# ------------------------------------------------------------

import tempfile
import time

from functools import lru_cache
from pathlib import Path
from typing import Literal


# ------------------------------------------------------------
# 2. FASTAPI AND PYDANTIC IMPORTS
# ------------------------------------------------------------

from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
)

from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, Field


# ------------------------------------------------------------
# 3. AUTHENTICATION IMPORTS
# ------------------------------------------------------------

from app.auth import (
    current_user,
    guard,
    require_admin,
)


# ------------------------------------------------------------
# 4. DATABASE IMPORTS
# ------------------------------------------------------------

from db.calendar import (
    add_holiday,
    dated_timetable,
    delete_holiday,
    get_active_semester,
    list_holidays,
    list_semesters,
    save_semester,
    sync_holidays,
)

from db.users import (
    create_user,
    list_users,
    remove_user,
    update_user,
)

from db.repository import (
    apply_moves,
    create_room,
    entries_in_room,
    get_active_timetable,
    get_client,
    get_entry,
    get_pins,
    get_room,
    list_classes,
    list_groups,
    list_rooms,
    list_runs,
    load_input,
    log_action,
    move_entry,
    save_run,
    seed,
    set_lock,
    soft_delete_room,
    update_class,
    update_room,
)


# ------------------------------------------------------------
# 5. IMPORTER AND SOLVER IMPORTS
# ------------------------------------------------------------

from importer.reader import parse_any as parse
from importer.run_import import PLACEHOLDER_ROOMS

from solver import engine as engine_v1
from solver import engine_v2

from solver.checker import check
from solver.engine import SolverError
from solver.reallocate import reallocate


# ============================================================
# 6. GLOBAL CONFIGURATION
# ============================================================

# Available timetable solving engines.
ENGINES = {
    "engine": engine_v1,
    "engine_v2": engine_v2,
}

# Maximum uploaded file size: 10 MB.
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


# ============================================================
# 7. FASTAPI APPLICATION INITIALISATION
# ============================================================

app = FastAPI(
    title="STAR API",
    description="Smart Timetable with Adaptive Reallocation",
    version="0.1.0",

    # Require authentication before accessing API routes.
    dependencies=[Depends(guard)],
)


# ------------------------------------------------------------
# CORS CONFIGURATION
# ------------------------------------------------------------

# Allow the React/Vite frontend to communicate with this API.
app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],

    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# 8. DATABASE CLIENT HELPER
# ============================================================

@lru_cache
def get_sb():
    """
    Return a shared Supabase client.

    lru_cache prevents creating a new client
    every time an API request is received.
    """
    return get_client()


# ============================================================
# 9. PYDANTIC REQUEST MODELS
# ============================================================


# ------------------------------------------------------------
# 9.1 TIMETABLE REQUEST MODELS
# ------------------------------------------------------------

class EntryIn(BaseModel):
    """Represent one timetable entry."""

    lesson_id: str
    room: str

    day: int = Field(
        ge=1,
        le=5,
        description="1 = Monday, 5 = Friday",
    )

    start_slot: int = Field(
        ge=1,
        le=10,
        description="1 = 08:30, 10 = 17:30",
    )


class CheckRequest(BaseModel):
    """Request body for timetable validation."""

    entries: list[EntryIn]


class MoveIn(BaseModel):
    """Request body for manually moving a timetable entry."""

    day: int = Field(ge=1, le=5)
    start_slot: int = Field(ge=1, le=10)

    room: str = Field(
        min_length=1,
        max_length=80,
    )

    force: bool = False


class LockIn(BaseModel):
    """Request body for locking or unlocking a timetable entry."""

    locked: bool


# ------------------------------------------------------------
# 9.2 CLASS REQUEST MODELS
# ------------------------------------------------------------

class ClassIn(BaseModel):
    """Allow Programme Leaders to update class requirements."""

    needs_lab: bool | None = None

    weekly_hours: int | None = Field(
        default=None,
        ge=1,
        le=20,
    )

    session_length: int | None = Field(
        default=None,
        ge=1,
        le=4,
    )

    students: int | None = Field(
        default=None,
        ge=1,
        le=500,
    )


# ------------------------------------------------------------
# 9.3 ROOM REQUEST MODELS
# ------------------------------------------------------------

class RoomIn(BaseModel):
    """Request body for creating or updating a room."""

    code: str = Field(
        min_length=1,
        max_length=80,
    )

    name: str | None = Field(
        default=None,
        max_length=120,
    )

    capacity: int = Field(
        ge=1,
        le=1000,
    )

    room_type: Literal["lecture", "lab"]

    remarks: str | None = Field(
        default=None,
        max_length=300,
    )


class RoomStatusIn(BaseModel):
    """Request body for changing room availability."""

    status: Literal[
        "available",
        "maintenance",
        "out_of_service",
    ]

    remarks: str | None = Field(
        default=None,
        max_length=300,
    )

    unavailable_from: str | None = Field(
        default=None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )

    unavailable_to: str | None = Field(
        default=None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )


# ------------------------------------------------------------
# 9.4 HOLIDAY REQUEST MODELS
# ------------------------------------------------------------

class HolidayIn(BaseModel):
    """Request body for creating a holiday."""

    date: str = Field(
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )

    name: str = Field(
        min_length=1,
        max_length=120,
    )

    is_teaching_day: bool = False

    note: str | None = Field(
        default=None,
        max_length=300,
    )


# ------------------------------------------------------------
# 9.5 SEMESTER REQUEST MODELS
# ------------------------------------------------------------

class SemesterIn(BaseModel):
    """Request body for creating a semester."""

    # Optional semester code generated from the start date.
    code: str | None = Field(
        default=None,
        max_length=20,
    )

    name: str | None = Field(
        default=None,
        max_length=60,
    )

    start_date: str = Field(
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )

    end_date: str = Field(
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )


# ------------------------------------------------------------
# 9.6 USER ACCOUNT REQUEST MODELS
# ------------------------------------------------------------

class UserIn(BaseModel):
    """Request body for creating a new user account."""

    email: str = Field(max_length=120)

    role: Literal["admin", "lecturer"]

    lecturer_name: str | None = Field(
        default=None,
        max_length=120,
    )

    is_part_time: bool = False

    password: str | None = Field(
        default=None,
        min_length=8,
        max_length=72,
    )

    note: str | None = Field(
        default=None,
        max_length=200,
    )


class UserPatch(BaseModel):
    """Request body for updating an existing user account."""

    role: Literal["admin", "lecturer"] | None = None

    is_part_time: bool | None = None

    note: str | None = Field(
        default=None,
        max_length=200,
    )


# ============================================================
# 10. FILE UPLOAD HELPER
# ============================================================

async def _parse_upload(file: UploadFile):
    """
    Validate and parse an uploaded timetable file.

    Supported formats:
    - CSV
    - XLSX
    - XLSM

    The uploaded file is temporarily saved before parsing.
    The temporary file is deleted after processing.
    """

    filename = file.filename or ""

    # Validate the uploaded file extension.
    if not filename.lower().endswith(
        (".csv", ".xlsx", ".xlsm")
    ):
        raise HTTPException(
            status_code=400,
            detail="Please upload a .csv or .xlsx file.",
        )

    # Read the uploaded file.
    raw = await file.read()

    # Check the maximum upload size.
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail="File is too large (maximum 10 MB).",
        )

    # Preserve the original file extension.
    suffix = Path(filename).suffix.lower()

    # Create a temporary file for parsing.
    with tempfile.NamedTemporaryFile(
        suffix=suffix,
        delete=False,
    ) as tmp:

        tmp.write(raw)
        path = Path(tmp.name)

    try:
        # Parse the uploaded file.
        return parse(path)

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Could not read the uploaded file: {e}",
        )

    finally:
        # Always delete the temporary file.
        path.unlink(missing_ok=True)


# ============================================================
# 11. HEALTH CHECK
# ============================================================

@app.get("/health")
def health():
    """
    Check whether the STAR API is running.
    """

    return {
        "status": "ok",
    }


# ============================================================
# 12. LOGIN AND ACCOUNT MANAGEMENT
# ============================================================


# ------------------------------------------------------------
# 12.1 GET CURRENT LOGGED-IN USER
# ------------------------------------------------------------

@app.get("/me")
def me(user=Depends(current_user)):
    """
    Retrieve the currently authenticated user's information.

    Used by the frontend to identify the logged-in user
    and determine their account role.
    """

    return user


# ------------------------------------------------------------
# 12.2 GET ALL USERS (ADMIN ONLY)
# ------------------------------------------------------------

@app.get(
    "/users",
    dependencies=[Depends(require_admin)],
)
def read_users(sb=Depends(get_sb)):
    """
    Retrieve all registered user accounts.

    Only administrators can access this endpoint.
    """

    return list_users(sb)


# ------------------------------------------------------------
# 12.3 CREATE USER (ADMIN ONLY)
# ------------------------------------------------------------

@app.post(
    "/users",
    status_code=201,
    dependencies=[Depends(require_admin)],
)
def add_user(
    u: UserIn,
    sb=Depends(get_sb),
    admin=Depends(current_user),
):
    """
    Create a new user account.

    Administrators can create admin and lecturer accounts.
    """

    try:
        row = create_user(
            sb,
            u.email,
            u.role,
            u.lecturer_name,
            u.is_part_time,
            u.password,
            u.note,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    # Record account creation in the audit log.
    log_action(
        sb,
        "user_added",
        {
            "email": row["email"],
            "role": row["role"],
        },
        admin["email"],
    )

    return row


# ------------------------------------------------------------
# 12.4 UPDATE USER (ADMIN ONLY)
# ------------------------------------------------------------

@app.patch(
    "/users/{user_id}",
    dependencies=[Depends(require_admin)],
)
def edit_user(
    user_id: int,
    p: UserPatch,
    sb=Depends(get_sb),
):
    """
    Update an existing user account.

    Administrators can modify:
    - User role.
    - Part-time lecturer status.
    - Account notes.
    """

    row = update_user(
        sb,
        user_id,
        p.role,
        p.is_part_time,
        p.note,
    )

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    return {
        "ok": True,
    }


# ------------------------------------------------------------
# 12.5 DELETE USER (ADMIN ONLY)
# ------------------------------------------------------------

@app.delete(
    "/users/{user_id}",
    dependencies=[Depends(require_admin)],
)
def delete_user(
    user_id: int,
    sb=Depends(get_sb),
    admin=Depends(current_user),
):
    """
    Remove an existing user account.

    The administrator's email is passed to the database
    operation to support account deletion restrictions.
    """

    try:
        if not remove_user(
            sb,
            user_id,
            admin["email"],
        ):
            raise HTTPException(
                status_code=404,
                detail="User not found.",
            )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    # Record account deletion in the audit log.
    log_action(
        sb,
        "user_removed",
        {
            "id": user_id,
        },
        admin["email"],
    )

    return {
        "ok": True,
    }


# ============================================================
# 13. TIMETABLE MANAGEMENT
# ============================================================


# ------------------------------------------------------------
# 13.1 GET ACTIVE TIMETABLE
# ------------------------------------------------------------

@app.get("/timetable")
def read_timetable(
    group: str | None = None,
    lecturer: str | None = None,
    sb=Depends(get_sb),
):
    """
    Retrieve the currently active timetable.

    Optional filters:
    - group: Filter by student group code.
    - lecturer: Filter by lecturer name.
    """

    tt = get_active_timetable(sb)

    if tt is None:
        raise HTTPException(
            status_code=404,
            detail="No active timetable yet. Generate one first.",
        )

    entries = tt["entries"]

    # Filter timetable entries by student group.
    if group:
        entries = [
            e for e in entries
            if group in e["groups"]
        ]

    # Filter timetable entries by lecturer.
    if lecturer:
        entries = [
            e for e in entries
            if e["lecturer"] == lecturer
        ]

    return {
        "run": tt["run"],
        "entries": entries,
    }


# ------------------------------------------------------------
# 13.2 GET TIMETABLE GENERATION HISTORY
# ------------------------------------------------------------

@app.get("/runs")
def read_runs(sb=Depends(get_sb)):
    """
    Retrieve all previously generated timetables.

    Results are ordered from newest to oldest.
    """

    return list_runs(sb)


# ------------------------------------------------------------
# 13.3 GENERATE TIMETABLE
# ------------------------------------------------------------

@app.post("/timetable/generate", status_code=201)
def generate(
    engine: Literal["engine", "engine_v2"] = "engine_v2",
    time_limit: float = 30,
    respect_locks: bool = True,
    sb=Depends(get_sb),
):
    """
    Generate a timetable using the selected solver.

    Parameters:
    - engine: Select the solving algorithm.
    - time_limit: Maximum solving time in seconds.
    - respect_locks: Preserve existing locked entries.

    The generated timetable is validated before saving.
    """

    # Validate the solver time limit.
    if not 0 < time_limit <= 120:
        raise HTTPException(
            status_code=400,
            detail="time_limit must be between 0 and 120 seconds.",
        )

    # Load the current timetable input data.
    data = load_input(sb)

    # Include locked timetable entries when requested.
    if respect_locks:
        data["pinned"] = get_pins(sb)

    # Check whether lessons exist.
    if not data["lessons"]:
        raise HTTPException(
            status_code=400,
            detail="No lessons in the database. Import data first.",
        )

    # Measure solver execution time.
    start = time.perf_counter()

    try:
        # Execute the selected timetable solver.
        result = ENGINES[engine].solve(
            data,
            time_limit=time_limit,
        )

    except SolverError as e:
        raise HTTPException(
            status_code=422,
            detail=str(e),
        )

    seconds = time.perf_counter() - start

    # Validate the generated timetable.
    problems = check(
        data,
        result["entries"],
    )

    # Reject the timetable if validation fails.
    if problems:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Checker rejected the timetable",
                "problems": problems,
            },
        )

    # Save the successful timetable generation.
    run_id = save_run(
        sb,
        result,
        engine,
        seconds,
    )

    return {
        "run_id": run_id,
        "status": result["status"],
        "penalty": result["penalty"],
        "seconds": round(seconds, 2),
        "classes": len(result["entries"]),
    }


# ------------------------------------------------------------
# 13.4 VALIDATE TIMETABLE
# ------------------------------------------------------------

@app.post("/timetable/check")
def check_timetable(
    req: CheckRequest,
    sb=Depends(get_sb),
):
    """
    Validate a complete timetable.

    Checks for timetable clashes and scheduling rule violations.
    """

    data = load_input(sb)

    problems = check(
        data,
        [e.model_dump() for e in req.entries],
    )

    return {
        "valid": not problems,
        "problems": problems,
    }


# ------------------------------------------------------------
# 13.5 MANUALLY MOVE TIMETABLE ENTRY
# ------------------------------------------------------------

@app.patch("/timetable/entries/{entry_id}")
def move(
    entry_id: int,
    m: MoveIn,
    sb=Depends(get_sb),
):
    """
    Manually move a timetable entry to another day, slot or room.

    The proposed change is validated before saving.

    Set force=true to allow saving despite conflicts.
    """

    entry = get_entry(sb, entry_id)

    if entry is None:
        raise HTTPException(
            status_code=404,
            detail="Entry not found.",
        )

    # Prevent changes to locked timetable entries.
    if entry["is_locked"]:
        raise HTTPException(
            status_code=409,
            detail="This class is locked. Unlock it first.",
        )

    tt = get_active_timetable(sb)

    if tt is None:
        raise HTTPException(
            status_code=404,
            detail="No active timetable.",
        )

    # Construct a proposed timetable with the selected entry moved.
    proposed = [
        {
            "lesson_id": e["session_id"],

            "room": (
                m.room
                if e["entry_id"] == entry_id
                else e["room"]
            ),

            "day": (
                m.day
                if e["entry_id"] == entry_id
                else e["day"]
            ),

            "start_slot": (
                m.start_slot
                if e["entry_id"] == entry_id
                else e["start_slot"]
            ),
        }

        for e in tt["entries"]
    ]

    data = load_input(sb)

    # Check whether the proposed timetable contains conflicts.
    problems = check(data, proposed)

    # Reject invalid changes unless force=true.
    if problems and not m.force:
        return {
            "saved": False,
            "valid": False,
            "problems": problems,
        }

    try:
        # Save the manual timetable change.
        move_entry(
            sb,
            entry_id,
            m.day,
            m.start_slot,
            m.room,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    # Record the manual change in the audit log.
    log_action(
        sb,
        "move_entry",
        {
            "entry_id": entry_id,
            "to": {
                "day": m.day,
                "slot": m.start_slot,
                "room": m.room,
            },
            "forced": bool(problems),
        },
    )

    return {
        "saved": True,
        "valid": not problems,
        "problems": problems,
    }


# ------------------------------------------------------------
# 13.6 LOCK OR UNLOCK TIMETABLE ENTRY
# ------------------------------------------------------------

@app.post("/timetable/entries/{entry_id}/lock")
def lock(
    entry_id: int,
    body: LockIn,
    sb=Depends(get_sb),
):
    """
    Lock or unlock a timetable entry.

    Locked entries cannot be manually moved.
    They can also be preserved during timetable generation.
    """

    if get_entry(sb, entry_id) is None:
        raise HTTPException(
            status_code=404,
            detail="Entry not found.",
        )

    row = set_lock(
        sb,
        entry_id,
        body.locked,
    )

    # Record the locking operation.
    log_action(
        sb,
        "lock_entry" if body.locked else "unlock_entry",
        {
            "entry_id": entry_id,
        },
    )

    return {
        "entry_id": entry_id,
        "locked": row["is_locked"],
    }


# ============================================================
# 14. IMPORT MANAGEMENT
# ============================================================


# ------------------------------------------------------------
# 14.1 PREVIEW IMPORTED DATA
# ------------------------------------------------------------

@app.post("/import/preview")
async def import_preview(file: UploadFile = File(...)):
    """
    Preview an uploaded Course Listing file.

    Displays:
    - Detected student groups.
    - Detected classes.
    - Skipped records.
    - Import warnings.

    No database changes are made during preview.
    """

    result = await _parse_upload(file)

    return {
        "groups": result["groups"],
        "classes": result["classes"],

        "skipped": [
            {
                "group": g,
                "code": c,
            }
            for g, c in result["skipped"]
        ],

        "warnings": result.get("warnings", []),
    }


# ------------------------------------------------------------
# 14.2 COMMIT IMPORTED DATA
# ------------------------------------------------------------

@app.post("/import/commit", status_code=201)
async def import_commit(
    file: UploadFile = File(...),
    sb=Depends(get_sb),
):
    """
    Import and save timetable data into Supabase.

    This endpoint performs actual database modifications.
    """

    result = await _parse_upload(file)

    if not result["classes"]:
        raise HTTPException(
            status_code=400,
            detail="No classes found in this file.",
        )

    # Seed the database with imported timetable information.
    seed(
        sb,
        {
            "rooms": PLACEHOLDER_ROOMS,
            "groups": result["groups"],

            # Remove the part_time field before database insertion.
            "classes": [
                {
                    k: v
                    for k, v in c.items()
                    if k != "part_time"
                }
                for c in result["classes"]
            ],
        },
    )

    return {
        "groups": len(result["groups"]),
        "classes": len(result["classes"]),
        "warnings": result.get("warnings", []),
    }


# ============================================================
# 15. HOLIDAY MANAGEMENT
# ============================================================


# ------------------------------------------------------------
# 15.1 SYNCHRONISE PUBLIC HOLIDAYS
# ------------------------------------------------------------

@app.post("/holidays/sync")
def sync(
    year: int,
    state: str = "PNG",
    sb=Depends(get_sb),
):
    """
    Generate or synchronise public holidays.

    Parameters:
    - year: Target calendar year.
    - state: Malaysian state code. Default is PNG.
    """

    if not 2020 <= year <= 2100:
        raise HTTPException(
            status_code=400,
            detail="year out of range.",
        )

    try:
        return sync_holidays(
            sb,
            year,
            state,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not generate holidays: {e}",
        )


# ------------------------------------------------------------
# 15.2 GET HOLIDAYS
# ------------------------------------------------------------

@app.get("/holidays")
def read_holidays(
    start: str | None = None,
    end: str | None = None,
    sb=Depends(get_sb),
):
    """
    Retrieve holidays within an optional date range.
    """

    return list_holidays(
        sb,
        start,
        end,
    )


# ------------------------------------------------------------
# 15.3 CREATE HOLIDAY
# ------------------------------------------------------------

@app.post("/holidays", status_code=201)
def create_holiday(
    h: HolidayIn,
    sb=Depends(get_sb),
):
    """
    Create a new holiday record.

    Teaching days can be marked separately.
    """

    return add_holiday(
        sb,
        h.date,
        h.name,
        h.is_teaching_day,
        h.note,
    )


# ------------------------------------------------------------
# 15.4 DELETE HOLIDAY
# ------------------------------------------------------------

@app.delete("/holidays/{date}", status_code=204)
def remove_holiday(
    date: str,
    sb=Depends(get_sb),
):
    """
    Delete a holiday using its date.
    """

    delete_holiday(
        sb,
        date,
    )


# ============================================================
# 16. SEMESTER MANAGEMENT
# ============================================================


# ------------------------------------------------------------
# 16.1 GET ALL SEMESTERS
# ------------------------------------------------------------

@app.get("/semesters")
def read_semesters(sb=Depends(get_sb)):
    """
    Retrieve all configured semesters.
    """

    return list_semesters(sb)


# ------------------------------------------------------------
# 16.2 CREATE SEMESTER AND SYNCHRONISE HOLIDAYS
# ------------------------------------------------------------

@app.post("/semesters", status_code=201)
def create_semester(
    s: SemesterIn,
    sb=Depends(get_sb),
):
    """
    Create a new semester and automatically synchronise
    public holidays for all calendar years covered
    by the semester.

    Example:
    A semester from September 2026 to February 2027
    will synchronise holidays for both 2026 and 2027.
    """

    # Validate the semester date range.
    if s.end_date <= s.start_date:
        raise HTTPException(
            status_code=400,
            detail="end_date must be after start_date.",
        )

    # Save the semester information first.
    saved = save_semester(
        sb,
        s.code,
        s.name,
        s.start_date,
        s.end_date,
    )

    # Determine all calendar years covered by the semester.
    start_year = int(s.start_date[:4])
    end_year = int(s.end_date[:4])

    # Automatically synchronise public holidays for each year.
    for year in range(start_year, end_year + 1):

        try:
            sync_holidays(
                sb,
                year,
            )

        except Exception:
            # Keep semester creation successful if holiday
            # synchronisation fails.
            pass

    return saved


# ============================================================
# 17. GROUP MANAGEMENT
# ============================================================

@app.get("/groups")
def read_groups(sb=Depends(get_sb)):
    """
    Retrieve all student intake groups.

    The response includes student counts for each group.
    """

    return list_groups(sb)


# ============================================================
# 18. ROOM MANAGEMENT
# ============================================================


# ------------------------------------------------------------
# 18.1 GET ALL ROOMS
# ------------------------------------------------------------

@app.get("/rooms")
def read_rooms(
    include_deleted: bool = False,
    sb=Depends(get_sb),
):
    """
    Retrieve available room records.

    Set include_deleted=true to include soft-deleted rooms.
    """

    return list_rooms(
        sb,
        include_deleted,
    )


# ------------------------------------------------------------
# 18.2 CREATE ROOM
# ------------------------------------------------------------

@app.post("/rooms", status_code=201)
def add_room(
    r: RoomIn,
    sb=Depends(get_sb),
):
    """
    Create a new lecture room or laboratory.
    """

    try:
        row = create_room(
            sb,
            r.model_dump(),
        )

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not create room: {e}",
        )

    # Record room creation in the audit log.
    log_action(
        sb,
        "create_room",
        {
            "code": r.code,
        },
    )

    return row


# ------------------------------------------------------------
# 18.3 UPDATE ROOM INFORMATION
# ------------------------------------------------------------

@app.patch("/rooms/{room_id}")
def edit_room(
    room_id: int,
    r: RoomIn,
    sb=Depends(get_sb),
):
    """
    Update room information such as capacity and room type.
    """

    row = update_room(
        sb,
        room_id,
        r.model_dump(),
    )

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Room not found.",
        )

    log_action(
        sb,
        "update_room",
        {
            "room_id": room_id,
        },
    )

    return row


# ------------------------------------------------------------
# 18.4 UPDATE ROOM AVAILABILITY
# ------------------------------------------------------------

@app.patch("/rooms/{room_id}/status")
def set_room_status(
    room_id: int,
    s: RoomStatusIn,
    sb=Depends(get_sb),
):
    """
    Change a room's operational status.

    Supported statuses:
    - available
    - maintenance
    - out_of_service

    Returns the classes affected by the status change.
    """

    room = get_room(
        sb,
        room_id,
    )

    if room is None:
        raise HTTPException(
            status_code=404,
            detail="Room not found.",
        )

    # Validate the unavailable date range.
    if (
        s.unavailable_to
        and s.unavailable_from
        and s.unavailable_to < s.unavailable_from
    ):
        raise HTTPException(
            status_code=400,
            detail="unavailable_to must be on or after unavailable_from.",
        )

    # Find timetable entries affected by the room status change.
    affected = (
        entries_in_room(sb, room_id)
        if s.status != "available"
        else []
    )

    row = update_room(
        sb,
        room_id,
        s.model_dump(),
    )

    # Record the room status change.
    log_action(
        sb,
        "room_status",
        {
            "room_id": room_id,
            "status": s.status,
            "affected": len(affected),
        },
    )

    return {
        "room": row,

        "affected_classes": [
            {
                "entry_id": e["id"],
                "code": e["sessions"]["classes"]["code"],
                "module": e["sessions"]["classes"]["module_name"],
                "day": e["day_of_week"],
                "start_slot": e["start_slot"],
            }
            for e in affected
        ],
    }


# ------------------------------------------------------------
# 18.5 DELETE ROOM (SOFT DELETE)
# ------------------------------------------------------------

@app.delete("/rooms/{room_id}", status_code=200)
def remove_room(
    room_id: int,
    sb=Depends(get_sb),
):
    """
    Soft-delete a room.

    The room record is retained in the database
    instead of being permanently removed.
    """

    row = soft_delete_room(
        sb,
        room_id,
    )

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Room not found.",
        )

    log_action(
        sb,
        "delete_room",
        {
            "room_id": room_id,
        },
    )

    return {
        "deleted": True,
        "room": row,
    }


# ============================================================
# 19. ADAPTIVE REALLOCATION
# ============================================================

@app.post("/rooms/{room_id}/reallocate")
def reallocate_room(
    room_id: int,
    apply: bool = False,
    sb=Depends(get_sb),
):
    """
    Find replacement rooms for classes in an unavailable room.

    Important:
    - Class days and time slots never change.
    - Only room assignments are modified.
    - apply=false: Preview the proposed changes.
    - apply=true: Save the proposed changes to the database.
    """

    room = get_room(
        sb,
        room_id,
    )

    if room is None:
        raise HTTPException(
            status_code=404,
            detail="Room not found.",
        )

    tt = get_active_timetable(sb)

    if tt is None:
        raise HTTPException(
            status_code=404,
            detail="No active timetable.",
        )

    # Identify all sessions currently assigned to this room.
    affected = [
        e["session_id"]
        for e in tt["entries"]
        if e["room"] == room["code"]
    ]

    # Return early if no timetable entries use this room.
    if not affected:
        return {
            "room": room["code"],
            "affected": 0,
            "moves": [],
            "unresolved": [],
        }

    # Load scheduling data.
    # Unavailable rooms are excluded from the available room list.
    data = load_input(sb)

    try:
        # Find alternative rooms without changing class times.
        result = reallocate(
            data,
            tt["entries"],
            affected,
        )

    except SolverError as e:
        raise HTTPException(
            status_code=422,
            detail=str(e),
        )

    # Apply proposed room changes only when requested.
    if apply and result["moves"]:

        apply_moves(
            sb,
            result["moves"],
        )

        # Record the reallocation operation.
        log_action(
            sb,
            "reallocate",
            {
                "room": room["code"],
                "moved": len(result["moves"]),
                "unresolved": result["unresolved"],
            },
        )

    return {
        "room": room["code"],
        "affected": len(affected),

        "applied": bool(
            apply and result["moves"]
        ),

        "moves": result["moves"],
        "unresolved": result["unresolved"],
    }


# ============================================================
# 20. CLASS MANAGEMENT
# ============================================================


# ------------------------------------------------------------
# 20.1 GET ALL CLASSES
# ------------------------------------------------------------

@app.get("/classes")
def read_classes(sb=Depends(get_sb)):
    """
    Retrieve all classes.

    Used by the subject-offering management form.
    """

    return list_classes(sb)


# ------------------------------------------------------------
# 20.2 UPDATE CLASS REQUIREMENTS
# ------------------------------------------------------------

@app.patch("/classes/{class_id}")
def edit_class(
    class_id: int,
    c: ClassIn,
    sb=Depends(get_sb),
):
    """
    Allow Programme Leaders to update class requirements.

    Examples:
    - Enable or disable laboratory requirements.
    - Change weekly teaching hours.
    - Change session length.
    - Update student numbers.

    Only fields with non-null values are updated.
    """

    # Remove fields that were not provided by the frontend.
    fields = {
        k: v
        for k, v in c.model_dump().items()
        if v is not None
    }

    if not fields:
        raise HTTPException(
            status_code=400,
            detail="Nothing to update.",
        )

    row = update_class(
        sb,
        class_id,
        fields,
    )

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Class not found.",
        )

    # Record the updated class information.
    log_action(
        sb,
        "update_class",
        {
            "class_id": class_id,
            **fields,
        },
    )

    return row


# ============================================================
# 21. DATED TIMETABLE
# ============================================================

@app.get("/timetable/dated")
def read_dated_timetable(
    start: str | None = None,
    end: str | None = None,
    group: str | None = None,
    lecturer: str | None = None,
    sb=Depends(get_sb),
):
    """
    Convert the weekly timetable into actual calendar dates.

    Uses:
    - Active semester dates.
    - Weekly timetable entries.
    - Public holidays.
    - Optional date range.
    - Optional group and lecturer filters.

    This allows the frontend to display the timetable
    according to the real academic calendar.
    """

    # Retrieve the currently active semester.
    semester = get_active_semester(sb)

    if semester is None:
        raise HTTPException(
            status_code=404,
            detail="No semester dates yet. Admin must set them on Import data.",
        )

    # Retrieve the active timetable with optional filters.
    tt = read_timetable(
        group,
        lecturer,
        sb,
    )

    # Retrieve holidays within the active semester.
    holidays = list_holidays(
        sb,
        semester["start_date"],
        semester["end_date"],
    )

    # Expand weekly entries into actual semester dates.
    entries = dated_timetable(
        tt["entries"],
        semester,
        holidays,
        start,
        end,
    )

    return {
        "semester": semester,
        "run": tt["run"],
        "entries": entries,
    }
import tempfile
import time
from functools import lru_cache
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from db.repository import (
    get_active_timetable, get_client, list_runs, load_input, save_run, seed,
)
from importer.course_listing import parse
from importer.run_import import PLACEHOLDER_ROOMS
from solver import engine as engine_v1
from solver import engine_v2
from solver.checker import check
from solver.engine import SolverError

ENGINES = {"engine": engine_v1, "engine_v2": engine_v2}
MAX_UPLOAD_BYTES = 2 * 1024 * 1024        # 2 MB is plenty for a course listing

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
             time_limit: float = 30, sb=Depends(get_sb)):
    """Run the AI solver on the current data and save it as the active timetable."""
    if not 0 < time_limit <= 120:
        raise HTTPException(400, "time_limit must be between 0 and 120 seconds")

    data = load_input(sb)
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
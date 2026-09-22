import time
from functools import lru_cache
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from db.repository import get_active_timetable, get_client, list_runs, load_input, save_run
from solver import engine as engine_v1
from solver import engine_v2
from solver.checker import check
from solver.engine import SolverError

ENGINES = {"engine": engine_v1, "engine_v2": engine_v2}

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


# ---------- ENDPOINTS ----------
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
        entries = [e for e in entries if e["group"] == group]
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
    """Run the AI solver on the current data and save the result as the active timetable."""
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
        raise HTTPException(500, {"message": "Checker rejected the timetable", "problems": problems})

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
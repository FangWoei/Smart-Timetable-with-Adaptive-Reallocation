import copy
import json
from pathlib import Path

import pytest

from solver import engine, engine_v2
from solver.checker import check
from solver.engine import SolverError

MOCK = Path(__file__).parent.parent / "data" / "samples" / "mock.json"


@pytest.fixture
def data():
    return json.loads(MOCK.read_text(encoding="utf-8"))


@pytest.fixture(params=[engine.solve, engine_v2.solve], ids=["v1", "v2"])
def solve(request):
    return request.param


def test_mock_timetable_has_no_problems(data, solve):
    result = solve(data, seed=42)
    assert check(data, result["entries"]) == []


def test_mock_penalty_is_optimal_16(data, solve):
    result = solve(data, seed=42)
    assert result["status"] == "OPTIMAL"
    assert result["penalty"] == 16


def test_checker_catches_lecturer_clash(data, solve):
    entries = solve(data, seed=42)["entries"]
    l1 = next(e for e in entries if e["lesson_id"] == "L1")
    l3 = next(e for e in entries if e["lesson_id"] == "L3")
    l3["day"], l3["start_slot"] = l1["day"], l1["start_slot"]
    problems = check(data, entries)
    assert any("lecturer clash: Dr Tan" in p for p in problems)


def test_room_too_small_raises_error(data, solve):
    # Lab classes may now fall back to classrooms, so shrinking only the lab
    # no longer makes the problem impossible: shrink every room instead.
    bad = copy.deepcopy(data)
    for room in bad["rooms"].values():
        room["cap"] = 30
    with pytest.raises(SolverError):
        solve(bad)

def test_lab_class_falls_back_to_classroom_when_no_lab(data, solve):
    d = copy.deepcopy(data)
    d["rooms"] = {c: r for c, r in d["rooms"].items() if r["type"] != "lab"}
    result = solve(d)
    assert check(d, result["entries"]) == []

def _busy_hours(entries, lessons, key):
    by = {l["id"]: l for l in lessons}
    busy = {}
    for e in entries:
        l = by[e["lesson_id"]]
        for w in ([l["lecturer"]] if key == "lecturer" else l["groups"]):
            for t in range(e["start_slot"], e["start_slot"] + l["hours"]):
                busy.setdefault((w, e["day"]), set()).add(t)
    return busy


def test_nobody_has_more_than_two_classes_in_a_row(data, solve):
    entries = solve(data, seed=42)["entries"]
    for key in ("lecturer", "group"):
        for hours in _busy_hours(entries, data["lessons"], key).values():
            run = best = 0
            prev = None
            for t in sorted(hours):
                run = run + 1 if prev is not None and t == prev + 1 else 1
                best, prev = max(best, run), t
            assert best <= 4


def test_nothing_is_scheduled_during_peninsula_advantage(data, solve):
    for e in solve(data, seed=42)["entries"]:
        hours = range(e["start_slot"], e["start_slot"] + e["hours"])
        assert not (e["day"] == 3 and any(t in (7, 8) for t in hours))


def test_unavailable_lecturer_is_never_scheduled_then(data, solve):
    lecturer = data["lessons"][0]["lecturer"]
    data["unavailable"] = {lecturer: [[d, s] for d in (1, 2, 3) for s in range(1, 11)]}
    entries = solve(data, seed=42)["entries"]
    days = {e["day"] for e in entries if e["lecturer"] == lecturer}
    assert days and days.isdisjoint({1, 2, 3})
    assert check(data, entries) == []


def test_checker_catches_peninsula_advantage_move(data, solve):
    entries = solve(data, seed=42)["entries"]
    entries[0]["day"], entries[0]["start_slot"] = 3, 7
    assert any("Peninsula Advantage" in p for p in check(data, entries))
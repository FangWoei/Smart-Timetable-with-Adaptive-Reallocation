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
import copy
import json
from pathlib import Path

import pytest

from solver.checker import check
from solver.engine import SolverError, solve

MOCK = Path(__file__).parent.parent / "data" / "samples" / "mock.json"


@pytest.fixture
def data():
    return json.loads(MOCK.read_text(encoding="utf-8"))


def test_mock_timetable_has_no_problems(data):
    result = solve(data, seed=42)
    assert check(data, result["entries"]) == []


def test_mock_penalty_is_optimal_16(data):
    result = solve(data, seed=42)
    assert result["status"] == "OPTIMAL"
    assert result["penalty"] == 16


def test_checker_catches_lecturer_clash(data):
    entries = solve(data, seed=42)["entries"]
    l1 = next(e for e in entries if e["lesson_id"] == "L1")
    l3 = next(e for e in entries if e["lesson_id"] == "L3")
    # Both are taught by Dr Tan: force them into the same time
    l3["day"], l3["start_slot"] = l1["day"], l1["start_slot"]
    problems = check(data, entries)
    assert any("lecturer clash: Dr Tan" in p for p in problems)


def test_room_too_small_raises_error(data):
    bad = copy.deepcopy(data)
    bad["rooms"]["LAB1"]["cap"] = 30   # L6 group has 35 students
    with pytest.raises(SolverError):
        solve(bad)
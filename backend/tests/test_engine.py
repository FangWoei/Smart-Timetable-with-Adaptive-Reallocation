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

def _two_part_class(unavailable=None):
    """One class of 4 hours cut into two 2-hour sessions, one lecturer, two rooms."""
    data = {
        "rooms": {"R1": {"cap": 40, "type": "lecture"}, "R2": {"cap": 40, "type": "lecture"}},
        "groups": {"G1": 30},
        "lessons": [
            {"id": f"C-{i}", "class_id": "C", "module": f"M (part {i})", "groups": ["G1"],
             "lecturer": "Tan", "hours": 2, "lab": False}
            for i in (1, 2)
        ],
    }
    if unavailable:
        data["unavailable"] = unavailable
    return data


def test_two_sessions_are_put_together_in_one_room_when_they_fit():
    data = _two_part_class()
    entries = engine_v2.solve(data, seed=1)["entries"]
    assert check(data, entries) == []
    a, b = sorted(entries, key=lambda e: e["start_slot"])
    assert a["day"] == b["day"]                      # one block
    assert b["start_slot"] == a["start_slot"] + 2    # back-to-back
    assert a["room"] == b["room"]                    # no room change in the middle


def test_two_sessions_split_onto_two_days_when_they_cannot_sit_together():
    # Tan can only teach 08:30-10:30 on Mon and Tue, so no 4-hour block exists.
    cells = [[d, s] for d in range(1, 6) for s in range(1, 11)
             if not (d in (1, 2) and s in (1, 2))]
    data = _two_part_class({"Tan": cells})
    entries = engine_v2.solve(data, seed=1)["entries"]
    assert check(data, entries) == []
    assert {e["day"] for e in entries} == {1, 2}


def test_checker_rejects_same_class_back_to_back_in_different_rooms():
    data = _two_part_class()
    entries = [
        {"lesson_id": "C-1", "room": "R1", "day": 1, "start_slot": 1},
        {"lesson_id": "C-2", "room": "R2", "day": 1, "start_slot": 3},
    ]
    assert any("same room" in p for p in check(data, entries))


def test_checker_rejects_same_class_same_day_with_a_gap():
    data = _two_part_class()
    entries = [
        {"lesson_id": "C-1", "room": "R1", "day": 1, "start_slot": 1},
        {"lesson_id": "C-2", "room": "R1", "day": 1, "start_slot": 5},
    ]
    assert any("back-to-back" in p for p in check(data, entries))
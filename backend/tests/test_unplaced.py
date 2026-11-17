import pytest
from fastapi.testclient import TestClient

from app import main, unplaced_routes as up
from solver import engine_v2


def lesson(i, groups=("G1",), lecturer="Ms Lim", hours=2, lab=False):
    return {"id": str(i), "class_id": f"C{i}", "module": f"Mod {i} (part 1)",
            "groups": list(groups), "students": None, "lecturer": lecturer,
            "hours": hours, "lab": lab}


@pytest.fixture
def world(monkeypatch):
    data = {"rooms": {"R1": {"cap": 40, "type": "lecture"}, "R2": {"cap": 40, "type": "lecture"}},
            "groups": {"G1": 20, "G2": 20},
            "lessons": [lesson(1), lesson(2, ("G2",), "Mr Tan"), lesson(3, ("G1",), "Mr Tan")],
            "unavailable": {}}
    state = {"entries": [  # lesson 1 placed Monday slot 1 in R1
        {"entry_id": 10, "session_id": "1", "room": "R1", "day": 1, "start_slot": 1,
         "hours": 2, "groups": ["G1"], "locked": False}], "inserted": []}

    monkeypatch.setattr(up, "load_input", lambda sb: data)
    monkeypatch.setattr(up, "get_active_timetable",
                        lambda sb: {"run": {"id": 7}, "entries": list(state["entries"])})
    monkeypatch.setattr(up, "log_action", lambda *a, **k: None)

    def fake_insert(sb, run_id, l, day, slot, room):
        row = {"id": 99, "session_id": l["id"], "day": day, "slot": slot, "room": room}
        state["inserted"].append(row)
        state["entries"].append({"entry_id": 99, "session_id": l["id"], "room": room,
                                 "day": day, "start_slot": slot, "hours": l["hours"],
                                 "groups": l["groups"], "locked": False})
        return row
    monkeypatch.setattr(up, "_insert_entry", fake_insert)

    monkeypatch.setenv("AUTH_REQUIRED", "false")
    main.app.dependency_overrides[main.get_sb] = lambda: object()
    yield TestClient(main.app), data, state
    main.app.dependency_overrides.clear()


def test_lists_only_lessons_without_an_entry(world):
    c, _, _ = world
    body = c.get("/timetable/unplaced").json()
    assert body["count"] == 2
    assert {u["session_id"] for u in body["unplaced"]} == {"2", "3"}
    u = body["unplaced"][0]
    assert {"id", "entry_id", "class_code", "module", "hours", "groups", "lecturer", "needs_lab"} <= u.keys()
    assert u["entry_id"] is None


def test_filter_by_group(world):
    c, _, _ = world
    ids = [u["session_id"] for u in c.get("/timetable/unplaced", params={"group": "G2"}).json()["unplaced"]]
    assert ids == ["2"]


def test_auto_place_places_all_without_moving_existing(world):
    c, data, state = world
    r = c.post("/timetable/unplaced/auto-place").json()
    assert r["placed"] == 2 and r["unplaced"] == 0
    assert c.get("/timetable/unplaced").json()["count"] == 0
    kept = next(e for e in state["entries"] if e["session_id"] == "1")
    assert (kept["day"], kept["start_slot"], kept["room"]) == (1, 1, "R1")
    from solver.checker import check
    assert check(data, [{"lesson_id": e["session_id"], "room": e["room"], "day": e["day"],
                         "start_slot": e["start_slot"]} for e in state["entries"]]) == []


def test_auto_place_keeps_what_fits_when_not_all_fit(world, monkeypatch):
    c, data, state = world
    real = engine_v2.solve

    def picky(d, time_limit=10, seed=None):          # lesson 3 can never be placed
        if any(l["id"] == "3" for l in d["lessons"] if l["id"] not in d["pinned"]):
            from solver.engine import SolverError
            raise SolverError("no")
        return real(d, time_limit=time_limit, seed=seed)
    monkeypatch.setattr(up.engine_v2, "solve", picky)

    r = c.post("/timetable/unplaced/auto-place").json()
    assert r["placed"] == 1 and r["unplaced"] == 1
    assert r["still_unplaced"][0]["session_id"] == "3"


def test_place_one_ok_and_clash(world):
    c, _, state = world
    # lesson 3 is G1 + Mr Tan; Monday slot 1 clashes with G1's lesson 1
    bad = c.post("/timetable/unplaced/3/place", json={"day": 1, "start_slot": 1, "room": "R2"}).json()
    assert bad["saved"] is False and bad["problems"]
    ok = c.post("/timetable/unplaced/3/place", json={"day": 2, "start_slot": 1, "room": "R2"}).json()
    assert ok["saved"] is True and ok["entry_id"] == 99
    forced = c.post("/timetable/unplaced/2/place",
                    json={"day": 1, "start_slot": 1, "room": "R1", "force": True}).json()
    assert forced["saved"] is True and forced["valid"] is False


def test_place_one_unknown_session(world):
    c, _, _ = world
    assert c.post("/timetable/unplaced/1/place",
                  json={"day": 2, "start_slot": 1, "room": "R1"}).status_code == 404   # already placed
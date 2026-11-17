import io

import pytest
from fastapi.testclient import TestClient
from openpyxl import load_workbook

from app import exports, main, publish_routes as pr


def entry(i, day, slot, module, groups=("G1",), lecturer="Ms Lim", hours=2, room="R1"):
    return {"entry_id": i, "locked": False, "session_id": str(i), "day": day, "start_slot": slot,
            "hours": hours, "module": module, "groups": list(groups), "lecturer": lecturer,
            "room": room, "start_time": "08:30", "end_time": "10:30"}


ENTRIES = [entry(1, 1, 1, "Maths (part 1)"),
           entry(2, 2, 3, "Art (part 1)", ("G2",), "Mr Tan", room="R2"),
           entry(3, 3, 1, "Joint (part 1)", ("G1", "G2"), None)]


def test_split_by_group_puts_shared_class_in_both():
    s = exports.split_by(ENTRIES, "group")
    assert list(s) == ["G1", "G2"]
    assert len(s["G1"]) == 2 and len(s["G2"]) == 2


def test_xlsx_has_grid_merged_cells_and_list():
    data = exports.build_xlsx("Group timetable", exports.split_by(ENTRIES, "group"), "group")
    wb = load_workbook(io.BytesIO(data))
    assert wb.sheetnames == ["G1", "G2", "All classes"]
    ws = wb["G1"]
    assert "Maths" in ws["B4"].value and "R1" in ws["B4"].value       # Monday 08:30
    assert any("B4:B5" in str(r) for r in ws.merged_cells.ranges)      # 2-hour class merged
    assert wb["All classes"].max_row == 4                              # header + 3 distinct classes


def test_pdf_is_a_pdf():
    data = exports.build_pdf("Lecturer timetable", {"Ms Lim": [ENTRIES[0]]}, "lecturer")
    assert data.startswith(b"%PDF")


def test_odd_names_are_safe_in_sheets():
    data = exports.build_xlsx("T", {"A/B:C?": [ENTRIES[0]], "A/B:C?x": []}, "group")
    assert len(load_workbook(io.BytesIO(data)).sheetnames) == 3


@pytest.fixture
def api(monkeypatch):
    state = {"active": {"run": {"id": 5, "is_published": False, "published_at": None}, "entries": ENTRIES},
             "published": None, "unplaced": []}
    monkeypatch.setattr(pr, "get_active_timetable", lambda sb: state["active"])
    monkeypatch.setattr(pr, "get_published_timetable", lambda sb: state["published"])
    monkeypatch.setattr(pr, "find_unplaced", lambda sb, tt=None: (tt, {}, state["unplaced"]))
    monkeypatch.setattr(pr, "log_action", lambda *a, **k: None)

    def fake_publish(sb, run_id):
        state["published"] = {"run": {"id": run_id}, "entries": ENTRIES}
        return {"id": run_id, "published_at": "2026-11-17T01:00:00+00:00"}
    monkeypatch.setattr(pr, "publish_run", fake_publish)
    monkeypatch.setattr(pr, "unpublish_all", lambda sb: state.update(published=None))
    monkeypatch.setenv("AUTH_REQUIRED", "false")
    main.app.dependency_overrides[main.get_sb] = lambda: object()
    yield TestClient(main.app), state
    main.app.dependency_overrides.clear()


def test_status_and_publish(api):
    c, _ = api
    assert c.get("/timetable/status").json()["published_run_id"] is None
    r = c.post("/timetable/publish")
    assert r.status_code == 200 and r.json()["published_run_id"] == 5
    assert c.get("/timetable/status").json()["published_run_id"] == 5
    c.post("/timetable/unpublish")
    assert c.get("/timetable/status").json()["published_run_id"] is None


def test_publish_refused_while_lessons_unplaced_unless_forced(api):
    c, state = api
    state["unplaced"] = [{"id": "9"}]
    r = c.post("/timetable/publish")
    assert r.status_code == 409
    assert c.post("/timetable/publish", json={"force": True}).status_code == 200


def test_export_files(api):
    c, _ = api
    r = c.get("/export/timetable.xlsx")
    assert r.status_code == 200 and "attachment" in r.headers["content-disposition"]
    assert load_workbook(io.BytesIO(r.content)).sheetnames[:2] == ["G1", "G2"]
    assert c.get("/export/timetable.pdf", params={"group": "G2"}).content.startswith(b"%PDF")
    assert c.get("/export/timetable.xlsx", params={"lecturer": "Mr Tan"}).status_code == 200
    assert c.get("/export/timetable.xlsx", params={"group": "NOPE"}).status_code == 404


def test_published_export_needs_a_published_timetable(api):
    c, _ = api
    assert c.get("/export/timetable.xlsx", params={"published": True}).status_code == 404
    c.post("/timetable/publish")
    assert c.get("/export/timetable.xlsx", params={"published": True}).status_code == 200
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app import auth, main
from db.lecturers import (
    load_unavailable, set_unavailable, teaching_hours,
)
from solver import engine, engine_v2
from solver.checker import check

D = "@peninsulamalaysia.edu.my"


class Q:
    def __init__(self, fake, name):
        self.fake, self.name = fake, name
        self.rows = fake.store.setdefault(name, [])
        self.f, self.op, self.payload = [], "select", None

    def select(self, *_a, **_k): return self
    def order(self, *_a, **_k): return self
    def eq(self, k, v): self.f.append((k, v)); return self
    def insert(self, p): self.op, self.payload = "insert", p; return self
    def update(self, p): self.op, self.payload = "update", p; return self
    def delete(self): self.op = "delete"; return self

    def execute(self):
        hit = [r for r in self.rows if all(r.get(k) == v for k, v in self.f)]
        if self.op == "insert":
            items = self.payload if isinstance(self.payload, list) else [self.payload]
            made = []
            for it in items:
                row = {"id": len(self.rows) + 1, **it}
                self.rows.append(row)
                made.append(row)
            return SimpleNamespace(data=made)
        if self.op == "update":
            for r in hit: r.update(self.payload)
            return SimpleNamespace(data=hit)
        if self.op == "delete":
            for r in hit: self.rows.remove(r)
            return SimpleNamespace(data=hit)
        out = []
        for r in hit:
            r = dict(r)
            lecs = self.fake.store["lecturers"]
            if self.name in ("allowed_users", "lecturer_unavailable"):
                r["lecturers"] = next((x for x in lecs if x["id"] == r.get("lecturer_id")), None)
            out.append(r)
        return SimpleNamespace(data=out)


class FakeSB:
    def __init__(self):
        self.store = {
            "lecturers": [{"id": 1, "name": "Ms Lim", "is_part_time": False},
                          {"id": 2, "name": "Mr Tan", "is_part_time": True}],
            "allowed_users": [
                {"id": 1, "email": "boss" + D, "role": "admin", "lecturer_id": None},
                {"id": 2, "email": "lim" + D, "role": "lecturer", "lecturer_id": 1},
                {"id": 3, "email": "tan" + D, "role": "lecturer", "lecturer_id": 2},
            ],
            "classes": [{"lecturer_id": 2, "module_name": "Maths", "weekly_hours": 4}],
            "lecturer_unavailable": [], "audit_log": [],
        }
        self.tokens = {"t-admin": "boss" + D, "t-ft": "lim" + D, "t-pt": "tan" + D}
        self.auth = SimpleNamespace(get_user=self._get_user)

    def _get_user(self, token):
        return SimpleNamespace(user=SimpleNamespace(email=self.tokens[token], id="u"))

    def table(self, name):
        return Q(self, name)


@pytest.fixture
def client(monkeypatch):
    fake = FakeSB()
    monkeypatch.setenv("AUTH_REQUIRED", "true")
    monkeypatch.setattr(auth, "_client", lambda: fake)
    auth._cache.clear()
    main.app.dependency_overrides[main.get_sb] = lambda: fake
    yield TestClient(main.app), fake
    main.app.dependency_overrides.clear()


def H(t): return {"Authorization": f"Bearer {t}"}


# ---------- who can see what ----------
def test_lecturer_cannot_read_admin_data(client):
    c, _ = client
    for path in ("/groups", "/rooms", "/timetable", "/users", "/lecturers", "/runs"):
        assert c.get(path, headers=H("t-pt")).status_code == 403, path


def test_lecturer_can_read_own_pages(client):
    c, _ = client
    assert c.get("/me", headers=H("t-pt")).status_code == 200
    assert c.get("/me/availability", headers=H("t-pt")).status_code == 200
    assert c.get("/holidays", headers=H("t-pt")).status_code == 200


def test_lecturer_cannot_write_other_things(client):
    c, _ = client
    assert c.post("/timetable/generate", headers=H("t-pt")).status_code == 403
    assert c.put("/lecturers/2/availability", headers=H("t-pt"),
                 json={"unavailable": []}).status_code == 403


def test_admin_can_read_everything(client):
    c, _ = client
    assert c.get("/lecturers", headers=H("t-admin")).status_code == 200


# ---------- add / remove lecturers ----------
def test_admin_adds_lecturer_without_email(client):
    c, fake = client
    r = c.post("/lecturers", headers=H("t-admin"), json={"name": "  Dr  New  Person ", "is_part_time": True})
    assert r.status_code == 201
    assert r.json()["name"] == "Dr New Person" and r.json()["is_part_time"] is True
    assert any(l["name"] == "Dr New Person" for l in fake.store["lecturers"])


def test_add_lecturer_with_email_also_invites_login(client):
    c, fake = client
    r = c.post("/lecturers", headers=H("t-admin"),
               json={"name": "Ms Wong", "email": "wong" + D})
    assert r.status_code == 201
    assert any(u["email"] == "wong" + D and u["role"] == "lecturer" for u in fake.store["allowed_users"])


def test_add_lecturer_rejects_duplicate_and_wrong_domain(client):
    c, _ = client
    assert c.post("/lecturers", headers=H("t-admin"), json={"name": "Ms Lim"}).status_code == 400
    assert c.post("/lecturers", headers=H("t-admin"),
                  json={"name": "Ms Wong", "email": "wong@gmail.com"}).status_code == 400


def test_only_admin_can_add_or_delete_lecturers(client):
    c, _ = client
    assert c.post("/lecturers", headers=H("t-pt"), json={"name": "Ms Wong"}).status_code == 403
    assert c.delete("/lecturers/1", headers=H("t-pt")).status_code == 403


def test_admin_deletes_lecturer(client):
    c, fake = client
    assert c.delete("/lecturers/2", headers=H("t-admin")).status_code == 200
    assert all(l["id"] != 2 for l in fake.store["lecturers"])
    assert c.delete("/lecturers/99", headers=H("t-admin")).status_code == 404


# ---------- availability ----------
def test_part_time_saves_own_availability(client):
    c, fake = client
    r = c.put("/me/availability", headers=H("t-pt"),
              json={"unavailable": [[1, 1], [1, 2], [5, 10], [1, 1]]})
    assert r.status_code == 200
    assert r.json()["unavailable"] == [[1, 1], [1, 2], [5, 10]]      # duplicates dropped
    assert c.get("/me/availability", headers=H("t-pt")).json()["unavailable"] == [[1, 1], [1, 2], [5, 10]]


def test_saving_again_replaces_the_old_list(client):
    c, _ = client
    c.put("/me/availability", headers=H("t-pt"), json={"unavailable": [[1, 1], [2, 2]]})
    r = c.put("/me/availability", headers=H("t-pt"), json={"unavailable": [[3, 3]]})
    assert r.json()["unavailable"] == [[3, 3]]


def test_full_time_cannot_set_availability(client):
    r = client[0].put("/me/availability", headers=H("t-ft"), json={"unavailable": [[1, 1]]})
    assert r.status_code == 400


def test_bad_day_or_slot_rejected(client):
    c, _ = client
    for bad in ([[0, 1]], [[6, 1]], [[1, 0]], [[1, 11]], [[1]]):
        assert c.put("/me/availability", headers=H("t-pt"),
                     json={"unavailable": bad}).status_code == 400, bad


def test_admin_can_set_any_lecturer_and_mark_part_time(client):
    c, fake = client
    assert c.put("/lecturers/1/availability", headers=H("t-admin"),
                 json={"unavailable": [[2, 3]]}).status_code == 200
    assert c.patch("/lecturers/1", headers=H("t-admin"), json={"is_part_time": True}).json()["is_part_time"] is True
    assert c.get("/lecturers/99/availability", headers=H("t-admin")).status_code == 404


def test_lecturer_list_has_fields_for_manage_page(client):
    rows = client[0].get("/lecturers", headers=H("t-admin")).json()
    tan = next(r for r in rows if r["name"] == "Mr Tan")
    assert tan["email"] == "tan" + D and tan["is_part_time"] and tan["assigned_hours"] == 4
    assert tan["subjects"] == ["Maths"]


def test_solver_input_format(client):
    _, fake = client
    set_unavailable(fake, 2, [[1, 1], [1, 2]])
    assert load_unavailable(fake) == {"Mr Tan": [[1, 1], [1, 2]]}


# ---------- the solver really respects it (both engines) ----------
@pytest.mark.parametrize("solve", [engine.solve, engine_v2.solve], ids=["v1", "v2"])
def test_solver_avoids_saved_availability(solve):
    data = {
        "rooms": {"R1": {"cap": 40, "type": "lecture"}},
        "groups": {"G1": 20},
        "lessons": [
            {"id": "a", "class_id": "A", "module": "M", "groups": ["G1"], "lecturer": "Mr Tan",
             "hours": 2, "lab": False},
            {"id": "b", "class_id": "B", "module": "N", "groups": ["G1"], "lecturer": "Mr Tan",
             "hours": 2, "lab": False},
        ],
        # blocked all of Mon-Thu, all day
        "unavailable": {"Mr Tan": [[d, s] for d in (1, 2, 3, 4) for s in range(1, 11)]},
    }
    result = solve(data, seed=1)
    assert {e["day"] for e in result["entries"]} == {5}
    assert check(data, result["entries"]) == []


# ---------- teaching hours ----------
ENT = [{"day": 1, "start_slot": 1, "hours": 2}, {"day": 3, "start_slot": 3, "hours": 2}]
SEM = {"start_date": "2026-01-05", "end_date": "2026-02-01"}      # 4 weeks, Jan 5 - Feb 1


def test_hours_per_day_week_month():
    h = teaching_hours(ENT, SEM, [])
    assert h["per_day"] == {1: 2, 2: 0, 3: 2, 4: 0, 5: 0}
    assert h["per_week"] == 4
    assert h["per_month"] == {"2026-01": 16}
    assert h["semester_total"] == 16


def test_holidays_do_not_count_as_teaching_hours():
    h = teaching_hours(ENT, SEM, [{"holiday_date": "2026-01-12", "name": "X"}])
    assert h["per_month"] == {"2026-01": 14}


def test_months_split_correctly():
    sem = {"start_date": "2026-01-26", "end_date": "2026-02-08"}   # 2 weeks over month end
    h = teaching_hours(ENT, sem, [])
    assert h["per_month"] == {"2026-01": 4, "2026-02": 4}


def test_me_timetable_and_hours_for_part_time(client, monkeypatch):
    c, fake = client
    tt = {"run": {"id": 1}, "entries": [
        {"lecturer": "Mr Tan", "day": 1, "start_slot": 1, "hours": 2, "module": "Maths"},
        {"lecturer": "Ms Lim", "day": 2, "start_slot": 1, "hours": 2, "module": "Art"}]}
    import app.lecturer_routes as lr
    monkeypatch.setattr(lr, "get_active_timetable", lambda sb: tt)
    monkeypatch.setattr(lr, "get_active_semester", lambda sb: None)
    r = c.get("/me/timetable", headers=H("t-pt")).json()
    assert [e["module"] for e in r["entries"]] == ["Maths"]          # only own classes
    assert c.get("/me/hours", headers=H("t-pt")).json()["per_week"] == 2
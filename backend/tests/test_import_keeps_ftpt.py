from types import SimpleNamespace

from db import repository


class T:
    def __init__(self, db, name): self.db, self.name, self.rows_out = db, name, None
    def select(self, *a, **k): return self
    def insert(self, rows): self.db.inserted.setdefault(self.name, []).extend(rows); return self
    def upsert(self, rows, **k): self.db.upserted.setdefault(self.name, []).extend(rows); return self
    def execute(self):
        return SimpleNamespace(data=self.db.existing.get(self.name, []))


class DB:
    def __init__(self, existing): self.existing, self.inserted, self.upserted = existing, {}, {}
    def table(self, name): return T(self, name)


def test_reimport_does_not_touch_existing_lecturers(monkeypatch):
    db = DB({"lecturers": [{"name": "Ms Lim"}]})
    monkeypatch.setattr(repository, "_id_map", lambda sb, t, k: {"Ms Lim": 1, "Mr Tan": 2, "PT Ali": 3,
                                                                 "C1": 1, "C2": 2, "C3": 3, "G1": 1})
    data = {"groups": {"G1": 20}, "classes": [
        {"id": "C1", "module": "A", "lecturer": "Ms Lim", "groups": ["G1"], "part_time": True},
        {"id": "C2", "module": "B", "lecturer": "Mr Tan", "groups": ["G1"], "part_time": True},
        {"id": "C3", "module": "C", "lecturer": "PT Ali", "groups": ["G1"]}]}
    repository.seed(db, data)
    made = {l["name"]: l["is_part_time"] for l in db.inserted["lecturers"]}
    assert "Ms Lim" not in made and "lecturers" not in db.upserted        # existing left alone
    assert made == {"Mr Tan": True, "PT Ali": True}                       # file flag / PT prefix for new ones
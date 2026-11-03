from collections import defaultdict
from ortools.sat.python import cp_model

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
SLOTS = 10            # 08:30-18:30, 1 hour each
MIDDAY = (4, 5)       # 12:30-13:30 and 13:30-14:30
MAX_LECT_HOURS = 9
MAX_GROUP_HOURS = 6
MAX_BUSY_RUN = 4     # nobody works more than 2 two-hour classes (4 hours) in a row

# Peninsula Advantage: Wednesday 14:30-16:30, nothing is scheduled.
# {day number (1 = Mon): 0-based hour slots}
BLOCKED = {3: (6, 7)}

class SolverError(Exception):
    """Raised when no valid timetable can be built from the input."""


def slot_time(slot):
    m = 8 * 60 + 30 + slot * 60
    return f"{m // 60:02d}:{m % 60:02d}"

def lecturer_blocked(data):
    """{(lecturer, day0, slot0)} from data["unavailable"] = {name: [[day, slot], ...]} (1-based)."""
    return {(lec, d - 1, s - 1)
            for lec, cells in data.get("unavailable", {}).items() for d, s in cells}


def start_allowed(lesson, d, s, unavailable):
    """Hard time rules for a lesson starting at 0-based day d, slot s."""
    if lesson["hours"] == 2 and s % 2:
        return False                      # 2-hour classes use the fixed slots (8:30, 10:30, ...)
    for t in range(s, s + lesson["hours"]):
        if t in BLOCKED.get(d + 1, ()):
            return False                  # Peninsula Advantage
        if (lesson["lecturer"], d, t) in unavailable:
            return False                  # lecturer is not available
    return True


def limit_runs(model, use, who):
    """Hard: nobody is busy for more than MAX_BUSY_RUN hours in a row."""
    for w in who:
        for d in range(len(DAYS)):
            for t in range(SLOTS - MAX_BUSY_RUN):
                window = [v for u in range(t, t + MAX_BUSY_RUN + 1) for v in use[w, d, u]]
                if window:
                    model.add(sum(window) <= MAX_BUSY_RUN)


def class_size(lesson, groups):
    """Head count: the stated number, or the sum of the attending groups."""
    return lesson.get("students") or sum(groups[g] for g in lesson["groups"])


def solve(data, time_limit=10, seed=None):
    rooms = data["rooms"]
    groups = data["groups"]
    lessons = data["lessons"]
    by_id = {l["id"]: l for l in lessons}
    size = {l["id"]: class_size(l, groups) for l in lessons}
    pinned = data.get("pinned", {})
    unavailable = lecturer_blocked(data)

    model = cp_model.CpModel()
    x = {}
    options = defaultdict(list)
    class_day = defaultdict(list)

    # Switches: one per (lesson, day, start slot, suitable room)
    for l in lessons:
        pin = pinned.get(l["id"])
        for d in range(len(DAYS)):
            if pin and pin["day"] - 1 != d:
                continue
            for s in range(SLOTS - l["hours"] + 1):
                if pin and pin["start_slot"] - 1 != s:
                    continue
                if not start_allowed(l, d, s, unavailable):
                    continue
                for r, info in rooms.items():
                    if pin and pin["room"] != r:
                        continue
                    if info["cap"] < size[l["id"]]:
                        continue
                    if info["type"] == "lab" and not l["lab"]:
                        continue           # don't waste a lab on a lecture class
                    v = model.new_bool_var(f"{l['id']}_{d}_{s}_{r}")
                    x[l["id"], d, s, r] = v
                    options[l["id"]].append(v)
                    class_day[l.get("class_id", l["id"]), d].append(v)

    # Hard: every lesson placed exactly once
    for l in lessons:
        if not options[l["id"]]:
            raise SolverError(f"No suitable room for {l['id']} {l['module']}")
        model.add_exactly_one(options[l["id"]])

    # Hard: two sessions of the same class never land on the same day
    for vs in class_day.values():
        model.add_at_most_one(vs)

    # Hard: no room / lecturer / group clashes
    room_use, lect_use, group_use = defaultdict(list), defaultdict(list), defaultdict(list)
    for (lid, d, s, r), v in x.items():
        l = by_id[lid]
        for t in range(s, s + l["hours"]):
            room_use[r, d, t].append(v)
            lect_use[l["lecturer"], d, t].append(v)
            for g in l["groups"]:
                group_use[g, d, t].append(v)


    for use in (room_use, lect_use, group_use):
        for vs in list(use.values()):
            model.add_at_most_one(vs)

    penalties = []

    for use in (room_use, lect_use, group_use):
        for vs in list(use.values()):
            model.add_at_most_one(vs)

    # Hard: max 2 classes in a row for every lecturer and group (this is the
    # rest rule; there is no fixed lunch break, free time is lunch)
    limit_runs(model, lect_use, {l["lecturer"] for l in lessons})
    limit_runs(model, group_use, groups)

    penalties = []

    # Soft: lecturer max 9 teaching hours per day
    for lec in {l["lecturer"] for l in lessons}:
        for d in range(len(DAYS)):
            load = sum(v for t in range(SLOTS) for v in lect_use[lec, d, t])
            over = model.new_int_var(0, SLOTS, f"over_{lec}_{d}")
            model.add(over >= load - MAX_LECT_HOURS)
            penalties.append(5 * over)

    # Soft: group max 6 study hours per day
    for g in groups:
        for d in range(len(DAYS)):
            load = sum(v for t in range(SLOTS) for v in group_use[g, d, t])
            over = model.new_int_var(0, SLOTS, f"gover_{g}_{d}")
            model.add(over >= load - MAX_GROUP_HOURS)
            penalties.append(8 * over)

    # Soft: prefer the smallest room that fits, avoid ending at 18:30
    for (lid, d, s, r), v in x.items():
        l = by_id[lid]
        cost = (rooms[r]["cap"] - size[lid]) // 10
        if s + l["hours"] == SLOTS:
            cost += 3
        penalties.append(cost * v)

    model.minimize(sum(penalties))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit
    if seed is not None:
        solver.parameters.random_seed = seed
        solver.parameters.num_workers = 1
    status = solver.solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise SolverError(f"No timetable found ({solver.status_name(status)})")

    entries = []
    for (lid, d, s, r), v in x.items():
        if solver.value(v):
            l = by_id[lid]
            entries.append({
                "lesson_id": lid,
                "module": l["module"],
                "groups": l["groups"],
                "lecturer": l["lecturer"],
                "room": r,
                "day": d + 1,
                "start_slot": s + 1,
                "hours": l["hours"],
                "start_time": slot_time(s),
                "end_time": slot_time(s + l["hours"]),
            })
    entries.sort(key=lambda e: (e["groups"][0], e["day"], e["start_slot"]))

    return {
        "status": solver.status_name(status),
        "penalty": solver.objective_value,
        "entries": entries,
    }
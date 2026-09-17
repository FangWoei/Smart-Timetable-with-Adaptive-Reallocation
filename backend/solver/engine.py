from collections import defaultdict
from ortools.sat.python import cp_model

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
SLOTS = 10            # 08:30-18:30, 1 hour each
MIDDAY = (4, 5)       # 12:30-13:30 and 13:30-14:30
MAX_LECT_HOURS = 9
MAX_GROUP_HOURS = 6


class SolverError(Exception):
    """Raised when no valid timetable can be built from the input."""


def slot_time(slot):
    m = 8 * 60 + 30 + slot * 60
    return f"{m // 60:02d}:{m % 60:02d}"


def solve(data, time_limit=10, seed=None):
    rooms = data["rooms"]
    groups = data["groups"]
    lessons = data["lessons"]
    by_id = {l["id"]: l for l in lessons}

    model = cp_model.CpModel()
    x = {}
    options = defaultdict(list)

    # Switches: one per (lesson, day, start slot, suitable room)
    for l in lessons:
        for d in range(len(DAYS)):
            for s in range(SLOTS - l["hours"] + 1):
                for r, info in rooms.items():
                    if info["cap"] < groups[l["group"]]:
                        continue
                    if l["lab"] != (info["type"] == "lab"):
                        continue
                    v = model.new_bool_var(f"{l['id']}_{d}_{s}_{r}")
                    x[l["id"], d, s, r] = v
                    options[l["id"]].append(v)

    # Hard: every lesson placed exactly once
    for l in lessons:
        if not options[l["id"]]:
            raise SolverError(f"No suitable room for {l['id']} {l['module']}")
        model.add_exactly_one(options[l["id"]])

    # Hard: no room / lecturer / group clashes
    room_use, lect_use, group_use = defaultdict(list), defaultdict(list), defaultdict(list)
    for (lid, d, s, r), v in x.items():
        l = by_id[lid]
        for t in range(s, s + l["hours"]):
            room_use[r, d, t].append(v)
            lect_use[l["lecturer"], d, t].append(v)
            group_use[l["group"], d, t].append(v)

    for use in (room_use, lect_use, group_use):
        for vs in list(use.values()):
            model.add_at_most_one(vs)

    penalties = []

    # Soft: each group keeps at least 1 free hour at midday
    for g in groups:
        for d in range(len(DAYS)):
            a = sum(group_use[g, d, MIDDAY[0]])
            b = sum(group_use[g, d, MIDDAY[1]])
            p = model.new_bool_var(f"nolunch_{g}_{d}")
            model.add(a + b - 1 <= p)
            penalties.append(10 * p)

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
        cost = (rooms[r]["cap"] - groups[l["group"]]) // 10
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
                "group": l["group"],
                "lecturer": l["lecturer"],
                "room": r,
                "day": d + 1,
                "start_slot": s + 1,
                "hours": l["hours"],
                "start_time": slot_time(s),
                "end_time": slot_time(s + l["hours"]),
            })
    entries.sort(key=lambda e: (e["group"], e["day"], e["start_slot"]))

    return {
        "status": solver.status_name(status),
        "penalty": solver.objective_value,
        "entries": entries,
    }
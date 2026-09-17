from collections import defaultdict

from ortools.sat.python import cp_model

from solver.engine import (
    DAYS, MAX_GROUP_HOURS, MAX_LECT_HOURS, MIDDAY, SLOTS,
    SolverError, slot_time,
)


def _new_solver(time_limit, seed):
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit
    if seed is not None:
        solver.parameters.random_seed = seed
        solver.parameters.num_workers = 1
    return solver


def _is_lab_room(info):
    return info["type"] == "lab"


def _ok(status):
    return status in (cp_model.OPTIMAL, cp_model.FEASIBLE)


# ---------- STAGE 1: decide WHEN each lesson happens ----------
def plan_times(lessons, rooms, groups, size, time_limit, seed):
    model = cp_model.CpModel()
    x = {}
    lect_use, group_use = defaultdict(list), defaultdict(list)
    room_demand = defaultdict(list)   # (is_lab, day, slot) -> [(size, switch)]
    penalties = []

    for l in lessons:
        choices = []
        for d in range(len(DAYS)):
            for s in range(SLOTS - l["hours"] + 1):
                v = model.new_bool_var(f"{l['id']}_{d}_{s}")
                x[l["id"], d, s] = v
                choices.append(v)
                for t in range(s, s + l["hours"]):
                    lect_use[l["lecturer"], d, t].append(v)
                    group_use[l["group"], d, t].append(v)
                    room_demand[l["lab"], d, t].append((size[l["id"]], v))
                if s + l["hours"] == SLOTS:      # soft: avoid ending at 18:30
                    penalties.append(3 * v)
        model.add_exactly_one(choices)

    # Hard: no lecturer / group clashes
    for use in (lect_use, group_use):
        for vs in use.values():
            model.add_at_most_one(vs)

    # Hard: every hour, enough rooms of the right type and size
    for is_lab in (False, True):
        caps = sorted({i["cap"] for i in rooms.values() if _is_lab_room(i) == is_lab})
        prev = 0
        for c in caps:
            n_rooms = sum(1 for i in rooms.values()
                          if _is_lab_room(i) == is_lab and i["cap"] > prev)
            for d in range(len(DAYS)):
                for t in range(SLOTS):
                    vs = [v for sz, v in room_demand[is_lab, d, t] if sz > prev]
                    if len(vs) > n_rooms:
                        model.add(sum(vs) <= n_rooms)
            prev = c

    # Soft: lunch hour
    for g in groups:
        for d in range(len(DAYS)):
            a = sum(group_use[g, d, MIDDAY[0]])
            b = sum(group_use[g, d, MIDDAY[1]])
            p = model.new_bool_var(f"nolunch_{g}_{d}")
            model.add(a + b - 1 <= p)
            penalties.append(10 * p)

    # Soft: lecturer max 9 hours/day
    for lec in {l["lecturer"] for l in lessons}:
        for d in range(len(DAYS)):
            load = sum(v for t in range(SLOTS) for v in lect_use[lec, d, t])
            over = model.new_int_var(0, SLOTS, f"over_{lec}_{d}")
            model.add(over >= load - MAX_LECT_HOURS)
            penalties.append(5 * over)

    # Soft: group max 6 hours/day
    for g in groups:
        for d in range(len(DAYS)):
            load = sum(v for t in range(SLOTS) for v in group_use[g, d, t])
            over = model.new_int_var(0, SLOTS, f"gover_{g}_{d}")
            model.add(over >= load - MAX_GROUP_HOURS)
            penalties.append(8 * over)

    model.minimize(sum(penalties))
    solver = _new_solver(time_limit, seed)
    status = solver.solve(model)
    if not _ok(status):
        raise SolverError(f"Stage 1 found no timetable ({solver.status_name(status)})")

    times = {lid: (d, s) for (lid, d, s), v in x.items() if solver.value(v)}
    return times, solver.objective_value, status


# ---------- STAGE 2: decide WHERE (times are fixed) ----------
def assign_rooms(lessons, rooms, size, times, time_limit, seed):
    model = cp_model.CpModel()
    y = {}
    room_use = defaultdict(list)
    costs = []

    for l in lessons:
        d, s = times[l["id"]]
        choices = []
        for r, info in rooms.items():
            if _is_lab_room(info) != l["lab"] or info["cap"] < size[l["id"]]:
                continue
            v = model.new_bool_var(f"{l['id']}_{r}")
            y[l["id"], r] = v
            choices.append(v)
            for t in range(s, s + l["hours"]):
                room_use[r, d, t].append(v)
            costs.append((info["cap"] - size[l["id"]]) // 10 * v)
        model.add_exactly_one(choices)

    # Hard: one lesson per room per hour
    for vs in room_use.values():
        model.add_at_most_one(vs)

    model.minimize(sum(costs))
    solver = _new_solver(time_limit, seed)
    status = solver.solve(model)
    if not _ok(status):
        raise SolverError(f"Stage 2 could not assign rooms ({solver.status_name(status)})")

    assigned = {lid: r for (lid, r), v in y.items() if solver.value(v)}
    return assigned, solver.objective_value, status


def solve(data, time_limit=10, seed=None):
    rooms, groups, lessons = data["rooms"], data["groups"], data["lessons"]
    by_id = {l["id"]: l for l in lessons}
    size = {l["id"]: groups[l["group"]] for l in lessons}

    # Fail early if a lesson has no suitable room at all
    for l in lessons:
        if not any(_is_lab_room(i) == l["lab"] and i["cap"] >= size[l["id"]]
                   for i in rooms.values()):
            raise SolverError(f"No suitable room for {l['id']} {l['module']}")

    times, pen1, st1 = plan_times(lessons, rooms, groups, size, time_limit, seed)
    assigned, pen2, st2 = assign_rooms(lessons, rooms, size, times, time_limit, seed)

    entries = []
    for lid, (d, s) in times.items():
        l = by_id[lid]
        entries.append({
            "lesson_id": lid,
            "module": l["module"],
            "group": l["group"],
            "lecturer": l["lecturer"],
            "room": assigned[lid],
            "day": d + 1,
            "start_slot": s + 1,
            "hours": l["hours"],
            "start_time": slot_time(s),
            "end_time": slot_time(s + l["hours"]),
        })
    entries.sort(key=lambda e: (e["group"], e["day"], e["start_slot"]))

    both_optimal = st1 == cp_model.OPTIMAL and st2 == cp_model.OPTIMAL
    return {
        "status": "OPTIMAL" if both_optimal else "FEASIBLE",
        "penalty": pen1 + pen2,
        "entries": entries,
    }
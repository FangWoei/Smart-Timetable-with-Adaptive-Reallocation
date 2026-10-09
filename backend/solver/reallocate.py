"""Adaptive reallocation: when a room becomes unavailable, move only the
classes that were in it. Everything else stays exactly where it is.

Time is never changed — only the room. If no room fits, the class is
reported as unresolved rather than being moved to another slot.
"""
from collections import defaultdict

from ortools.sat.python import cp_model

from solver.engine import SolverError, class_size


def reallocate(data, entries, affected_ids, time_limit=10, seed=None):
    """Find new rooms for the affected entries.

    data          solver input (rooms already exclude unavailable ones)
    entries       the current timetable
    affected_ids  lesson ids that need a new room
    """
    rooms = data["rooms"]
    groups = data["groups"]
    lessons = {l["id"]: l for l in data["lessons"]}
    affected = set(affected_ids)

    # Hours already taken by classes that are NOT moving
    busy = defaultdict(set)                       # (day, slot) -> room codes
    for e in entries:
        if e["session_id"] in affected:
            continue
        for t in range(e["start_slot"], e["start_slot"] + e["hours"]):
            busy[e["day"], t].add(e["room"])

    model = cp_model.CpModel()
    y = {}
    options = defaultdict(list)
    use = defaultdict(list)                       # (room, day, slot) -> vars
    costs = []
    unresolved = []

    for e in entries:
        lid = e["session_id"]
        if lid not in affected:
            continue
        l = lessons.get(lid)
        if l is None:
            continue
        size = class_size(l, groups)

        for r, info in rooms.items():
            if info["cap"] < size:
                continue
            if info["type"] == "lab" and not l["lab"]:
                continue
            slots = range(e["start_slot"], e["start_slot"] + e["hours"])
            if any(r in busy[e["day"], t] for t in slots):
                continue                          # already occupied

            v = model.new_bool_var(f"{lid}_{r}")
            y[lid, r] = v
            options[lid].append(v)
            for t in slots:
                use[r, e["day"], t].append(v)

            cost = (info["cap"] - size) // 10
            if l["lab"] and info["type"] != "lab":
                cost += 6                         # lab class in a normal room
            if r == e["room"]:
                cost -= 20                        # strongly prefer staying put
            costs.append(cost * v)

        if not options[lid]:
            unresolved.append(lid)
        else:
            model.add_exactly_one(options[lid])

    # Two moved classes must not take the same room at the same hour
    for vs in use.values():
        model.add_at_most_one(vs)

    if not y:
        return {"moves": [], "unresolved": unresolved}

    model.minimize(sum(costs))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit
    if seed is not None:
        solver.parameters.random_seed = seed
        solver.parameters.num_workers = 1
    status = solver.solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise SolverError("Could not find replacement rooms")

    by_id = {e["session_id"]: e for e in entries}
    moves = []
    for (lid, r), v in y.items():
        if solver.value(v) and r != by_id[lid]["room"]:
            moves.append({
                "lesson_id": lid,
                "module": by_id[lid]["module"],
                "from_room": by_id[lid]["room"],
                "to_room": r,
                "day": by_id[lid]["day"],
                "start_slot": by_id[lid]["start_slot"],
            })

    return {"moves": moves, "unresolved": unresolved}
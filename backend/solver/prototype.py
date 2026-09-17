from collections import defaultdict
from ortools.sat.python import cp_model

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
SLOTS = 10            # 08:30-18:30, 1 hour each
MIDDAY = (4, 5)       # 12:30-13:30 and 13:30-14:30
MAX_LECT_HOURS = 9

# ---------- MOCK DATA (replace with importer output later) ----------
rooms = {
    "R101": {"cap": 40, "type": "lecture"},
    "R102": {"cap": 40, "type": "lecture"},
    "LAB1": {"cap": 40, "type": "lab"},
    "HALL": {"cap": 120, "type": "lecture"},
}
groups = {"BSCS202509-L6": 35, "BSCS202509-L7": 28, "DIT202601": 60}
lessons = [
    dict(id="L1",  module="Programming 1",     group="BSCS202509-L6", lecturer="Dr Tan", hours=2, lab=False),
    dict(id="L2",  module="Programming 1 Lab", group="BSCS202509-L6", lecturer="Dr Tan", hours=2, lab=True),
    dict(id="L3",  module="Programming 1",     group="BSCS202509-L7", lecturer="Dr Tan", hours=2, lab=False),
    dict(id="L4",  module="Programming 1 Lab", group="BSCS202509-L7", lecturer="Dr Tan", hours=2, lab=True),
    dict(id="L5",  module="Maths",             group="BSCS202509-L6", lecturer="Ms Lim", hours=3, lab=False),
    dict(id="L6",  module="Maths",             group="BSCS202509-L7", lecturer="Ms Lim", hours=3, lab=False),
    dict(id="L7",  module="Networking",        group="BSCS202509-L6", lecturer="PT 1",   hours=2, lab=False),
    dict(id="L8",  module="Networking Lab",    group="BSCS202509-L7", lecturer="PT 1",   hours=2, lab=True),
    dict(id="L9",  module="Business Comm",     group="DIT202601",     lecturer="Mr Raj", hours=3, lab=False),
    dict(id="L10", module="IT Fundamentals",   group="DIT202601",     lecturer="Ms Lim", hours=2, lab=False),
]
by_id = {l["id"]: l for l in lessons}

# ---------- MODEL ----------
model = cp_model.CpModel()
x = {}  # (lesson, day, start_slot, room) -> placed?
options = defaultdict(list)

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
        raise SystemExit(f"No suitable room for {l['id']} {l['module']}")
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

# Soft: each group keeps at least 1 free hour at midday
penalties = []
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

model.minimize(sum(penalties))

# ---------- SOLVE ----------
solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = 10
status = solver.solve(model)

if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
    raise SystemExit("No timetable found")

print(solver.status_name(status), "| penalty =", solver.objective_value, "\n")

def fmt(slot):
    m = 8 * 60 + 30 + slot * 60
    return f"{m // 60:02d}:{m % 60:02d}"

placed = sorted(
    (by_id[lid]["group"], d, s, lid, r)
    for (lid, d, s, r), v in x.items() if solver.value(v)
)
current = None
for g, d, s, lid, r in placed:
    if g != current:
        print(f"== {g} ==")
        current = g
    l = by_id[lid]
    print(f"  {DAYS[d]} {fmt(s)}-{fmt(s + l['hours'])}  {l['module']:<18} {r:<5} {l['lecturer']}")
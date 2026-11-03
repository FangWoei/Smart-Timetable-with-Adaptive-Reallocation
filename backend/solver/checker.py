from collections import defaultdict

from solver.engine import BLOCKED, DAYS, MAX_BUSY_RUN, SLOTS, class_size, lecturer_blocked, slot_time


def check(data, entries):
    """Return a list of problems in a timetable. Empty list = valid."""
    rooms = data["rooms"]
    groups = data["groups"]
    lessons = {l["id"]: l for l in data["lessons"]}
    problems = []

    counts = defaultdict(int)
    for e in entries:
        counts[e["lesson_id"]] += 1
    for lid in lessons:
        if counts[lid] != 1:
            problems.append(f"{lid} scheduled {counts[lid]} times")

    busy = {}
    unavailable = lecturer_blocked(data)
    hours_busy = defaultdict(set)         # (kind, who, day) -> 1-based hours in use
    class_days = defaultdict(set)
    for e in entries:
        lid = e["lesson_id"]
        l = lessons.get(lid)
        if l is None:
            problems.append(f"Unknown lesson {lid}")
            continue
        room = rooms.get(e["room"])
        if room is None:
            problems.append(f"{lid}: unknown room {e['room']}")
            continue

        if room["cap"] < class_size(l, groups):
            problems.append(f"{lid}: {e['room']} too small")

        start = e["start_slot"]
        if start < 1 or start + l["hours"] - 1 > SLOTS:
            problems.append(f"{lid}: outside teaching hours")

        day_name = DAYS[e["day"] - 1] if 1 <= e["day"] <= len(DAYS) else f"day {e['day']}"
        if l["hours"] == 2 and (start - 1) % 2:
            problems.append(f"{lid}: 2-hour classes must start at 8:30, 10:30, 12:30, 14:30 or 16:30")
        for t in range(start, start + l["hours"]):
            if (t - 1) in BLOCKED.get(e["day"], ()):
                problems.append(f"{lid}: {day_name} {slot_time(t - 1)} is Peninsula Advantage, no classes")
                break
        for t in range(start, start + l["hours"]):
            if (l["lecturer"], e["day"] - 1, t - 1) in unavailable:
                problems.append(f"{lid}: {l['lecturer']} is not available on {day_name} at {slot_time(t - 1)}")
                break

        cid = l.get("class_id", lid)
        if e["day"] in class_days[cid]:
            problems.append(f"{cid}: two sessions on day {e['day']}")
        class_days[cid].add(e["day"])

        if not l["lab"] and room["type"] == "lab":
            problems.append(f"{lid}: non-lab class in lab room {e['room']}")

        for t in range(start, start + l["hours"]):
            owners = [("room", e["room"]), ("lecturer", l["lecturer"])]
            owners += [("group", g) for g in l["groups"]]
            for kind, who in owners:
                if kind != "room":
                    hours_busy[kind, who, e["day"]].add(t)
                key = (kind, who, e["day"], t)
                if key in busy:
                    problems.append(
                        f"{kind} clash: {who} day {e['day']} slot {t} "
                        f"({busy[key]} vs {lid})"
                    )
                else:
                    busy[key] = lid

        # No more than MAX_BUSY_RUN hours in a row for any lecturer or group
    for (kind, who, day), hours in hours_busy.items():
        run = longest = 0
        prev = None
        for t in sorted(hours):
            run = run + 1 if prev is not None and t == prev + 1 else 1
            longest, prev = max(longest, run), t
        if longest > MAX_BUSY_RUN:
            problems.append(f"{kind} {who}: {longest} hours in a row on {DAYS[day - 1]}, "
                            f"maximum is {MAX_BUSY_RUN} (2 classes)")

    return problems
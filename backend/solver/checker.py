from collections import defaultdict

from solver.engine import SLOTS, class_size


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
        if l["lab"] != (room["type"] == "lab"):
            problems.append(f"{lid}: wrong room type {e['room']}")

        start = e["start_slot"]
        if start < 1 or start + l["hours"] - 1 > SLOTS:
            problems.append(f"{lid}: outside teaching hours")

        cid = l.get("class_id", lid)
        if e["day"] in class_days[cid]:
            problems.append(f"{cid}: two sessions on day {e['day']}")
        class_days[cid].add(e["day"])

        for t in range(start, start + l["hours"]):
            owners = [("room", e["room"]), ("lecturer", l["lecturer"])]
            owners += [("group", g) for g in l["groups"]]
            for kind, who in owners:
                key = (kind, who, e["day"], t)
                if key in busy:
                    problems.append(
                        f"{kind} clash: {who} day {e['day']} slot {t} "
                        f"({busy[key]} vs {lid})"
                    )
                else:
                    busy[key] = lid

    return problems
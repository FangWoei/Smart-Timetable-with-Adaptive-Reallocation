def expand(data):
    """Turn class definitions into the individual sessions the solver places.

    A class with weekly_hours=4 and session_length=2 becomes two 2-hour
    sessions, MAL1012-1 and MAL1012-2, which share a class_id so the
    solver can keep them on different days.
    """
    if "classes" not in data:
        return data                      # already in session format

    lessons = []
    for c in data["classes"]:
        total = c.get("weekly_hours", 4)
        length = c.get("session_length", total)
        parts = []
        while total > 0:
            take = min(length, total)
            parts.append(take)
            total -= take

        for i, hours in enumerate(parts, start=1):
            lessons.append({
                "id": f"{c['id']}-{i}" if len(parts) > 1 else c["id"],
                "class_id": c["id"],
                "module": c["module"] + (f" (part {i})" if len(parts) > 1 else ""),
                "groups": c["groups"],
                "students": c.get("students"),
                "lecturer": c["lecturer"],
                "hours": hours,
                "lab": c.get("lab", False),
            })

    return {"rooms": data["rooms"], "groups": data["groups"], "lessons": lessons}
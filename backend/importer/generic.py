"""Read a header-based course CSV (any column order, flexible names).

Unlike course_listing.py (fixed ASc column positions), this reads the
header row and maps columns by name.
"""
import csv

# field -> accepted header names (lowercase, spaces/underscores ignored)
ALIASES = {
    "code":     ["coursecode", "modulecode", "subjectcode", "code"],
    "module":   ["coursename", "modulename", "subjectname", "module", "subject", "name"],
    "lecturer": ["lecturer", "teacher", "instructor", "staff"],
    "group":    ["intakegroup", "group", "class", "cohort"],
    "students": ["studentcount", "students", "studentno", "enrolment"],
    "hours":    ["hoursperweek", "weeklyhours", "hours"],
    "sessions": ["sessions", "sessionsperweek", "lecturetutorial"],
    "roomtype": ["roomtype", "venuetype", "roomkind"],
    "faculty":  ["faculty", "programme", "program", "school", "department"],
}

REQUIRED = ("code", "module", "group")
DEFAULT_WEEKLY_HOURS = 4


def _norm(s):
    return "".join(ch for ch in s.lower() if ch.isalnum())


def map_headers(header_row):
    """Return {field: column index} for the columns we recognise."""
    found = {}
    for i, cell in enumerate(header_row):
        key = _norm(cell or "")
        for field, names in ALIASES.items():
            if key in names and field not in found:
                found[field] = i
    return found


def looks_generic(path):
    """True if the first row is a header we can map."""
    try:
        with open(path, newline="", encoding="utf-8-sig") as f:
            first = next(csv.reader(f), [])
    except (OSError, StopIteration):
        return False
    cols = map_headers(first)
    return all(f in cols for f in REQUIRED)


def parse(path):
    """Build {groups, classes, skipped, warnings} from a header-based CSV."""
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))

    if not rows:
        return {"groups": {}, "classes": [], "skipped": [], "warnings": ["File is empty"]}

    cols = map_headers(rows[0])
    missing = [f for f in REQUIRED if f not in cols]
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")

    def cell(row, field, default=""):
        i = cols.get(field)
        return row[i].strip() if i is not None and i < len(row) else default

    def number(row, field, default=0):
        raw = cell(row, field)
        try:
            return int(float(raw))
        except ValueError:
            return default

    groups, classes, warnings = {}, {}, []

    for row in rows[1:]:
        if not any(c.strip() for c in row):
            continue
        code = cell(row, "code")
        module = cell(row, "module")
        group = cell(row, "group")
        if not code or not module or not group:
            continue

        count = number(row, "students")
        if count <= 0:
            warnings.append(f"{code} / {group}: no student count, assumed 0")
        groups[group] = max(groups.get(group, 0), count)

        weekly = number(row, "hours", 0) or DEFAULT_WEEKLY_HOURS
        if not cell(row, "hours"):
            warnings.append(f"{code}: no hours given, defaulted to {DEFAULT_WEEKLY_HOURS}h")

        n_sessions = number(row, "sessions", 0)
        length = max(1, round(weekly / n_sessions)) if n_sessions else weekly

        is_lab = "lab" in cell(row, "roomtype").lower()

        c = classes.setdefault(code, {
            "id": code,
            "module": module,
            "groups": [],
            "students": 0,
            "lecturer": cell(row, "lecturer") or f"UNASSIGNED {code}",
            "weekly_hours": weekly,
            "session_length": length,
            "lab": is_lab,
            "part_time": False,
            "faculty": cell(row, "faculty") or None,
        })
        if group not in c["groups"]:
            c["groups"].append(group)
            c["students"] += count

    return {
        "groups": groups,
        "classes": sorted(classes.values(), key=lambda c: c["id"]),
        "skipped": [],
        "warnings": warnings,
    }
import csv
import re

# Column positions in the Course Listing export
COL_GROUP = 2
COL_STUDENTS = 3
COL_SEMESTER = 4
COL_CODE = 5
COL_NAME = 6
COL_LECTURER = 7
COL_FTPT = 9
COL_HOURS = 12
LAST_USEFUL_COL = 15          # everything after this is student names

SKIP_CODES = {"PCM3006"}      # industrial training: not timetabled
DEFAULT_WEEKLY_HOURS = 4
DEFAULT_SESSION_LENGTH = 2

# Same person written two ways across the files
LECTURER_ALIASES = {
    "eric kong": "Kong Kok Wah @ Eric",
}


def clean_group(raw):
    """'BSCS 202506 (L6)' -> 'BSCS202506-L6'"""
    m = re.match(r"\s*([A-Z]+)\s*(\d{6})\s*\(([^)]+)\)", raw.strip())
    if not m:
        return None
    programme, intake, level = m.groups()
    return f"{programme}{intake}-{level.strip()}"


def clean_module(raw):
    """'Software Engineering 2 (6)' -> ('Software Engineering 2', 6)"""
    m = re.match(r"\s*(.+?)\s*\((\d+)\)\s*$", raw.strip())
    if m:
        return m.group(1).strip(), int(m.group(2))
    return raw.strip(), None


def clean_lecturer(raw):
    """First name only when a cell holds 'A / B', plus alias fixing."""
    name = raw.split("/")[0].strip()
    return LECTURER_ALIASES.get(name.lower(), name)


def read_rows(path):
    """Yield only the real data rows, ignoring headers, blanks and names."""
    with open(path, newline="", encoding="utf-8-sig") as f:
        for row in csv.reader(f):
            row = row[:LAST_USEFUL_COL + 1]          # drop student names
            if len(row) <= COL_LECTURER:
                continue
            group = clean_group(row[COL_GROUP])
            code = row[COL_CODE].strip()
            if not group or not code or not row[COL_NAME].strip():
                continue
            yield row, group, code


def parse(path):
    """Build {groups, classes, skipped, warnings} from the Course Listing CSV."""
    groups = {}
    classes = {}
    skipped = []
    warnings = []

    for row, group, code in read_rows(path):
        if code in SKIP_CODES:
            skipped.append((group, code))
            continue

        module, suffix = clean_module(row[COL_NAME])
        lecturer = clean_lecturer(row[COL_LECTURER])

        try:
            group_students = int(row[COL_STUDENTS])
        except (ValueError, IndexError):
            group_students = 0
        groups.setdefault(group, group_students)

        hours = row[COL_HOURS].strip() if len(row) > COL_HOURS else ""
        weekly = int(hours) if hours.isdigit() else DEFAULT_WEEKLY_HOURS

        c = classes.setdefault(code, {
            "id": code,
            "module": module,
            "groups": [],
            "students": 0,
            "lecturer": lecturer,
            "weekly_hours": weekly,
            "session_length": DEFAULT_SESSION_LENGTH,
            "lab": False,
            "part_time": row[COL_FTPT].strip().upper() == "PT" if len(row) > COL_FTPT else False,
        })

        if group not in c["groups"]:
            c["groups"].append(group)
            c["students"] += suffix if suffix else group_students

        if suffix is None:
            warnings.append(f"{code} / {group}: module name has no (n) suffix, "
                            f"used STUDENT NO = {group_students}")

    if classes and all(c["weekly_hours"] == DEFAULT_WEEKLY_HOURS for c in classes.values()):
        warnings.append(f"HOURS PER WEEK column is empty — "
                        f"defaulted every class to {DEFAULT_WEEKLY_HOURS}h")

    return {
        "groups": groups,
        "classes": sorted(classes.values(), key=lambda c: c["id"]),
        "skipped": skipped,
        "warnings": warnings,
    }
"""Read the ASc Course Listing .xlsx directly.

The xlsx has columns the CSV export leaves blank: HOURS PER WEEK and
LECTURE TUTORIAL (the session count). Student names are never read.
"""
import re

from openpyxl import load_workbook

# Column indexes in the 'Template 2' sheet (0-based)
COL_MERGED = 1
COL_GROUP = 6
COL_STUDENTS = 7
COL_SEMESTER = 8
COL_CODE = 10
COL_NAME = 11
COL_LECTURER = 12
COL_FTPT = 13
COL_LT = 18          # "2 (L + T)" -> 2 sessions
COL_HOURS = 19       # hours per week
LAST_USEFUL_COL = 22  # everything after this is student names

SKIP_CODES = {"PCM3006"}
DEFAULT_WEEKLY_HOURS = 4

# A module needs a computer lab if its name matches any of these.
# The PL can override this per class afterwards.
LAB_KEYWORDS = (
    "programming", "software engineering", "full-stack", "full stack",
    "computing practice", "database", "web", "project", "machine learning",
    "information management", "computer systems", "networking", "security operations",
)

LECTURER_ALIASES = {"eric kong": "Kong Kok Wah @ Eric"}


def clean_group(raw):
    m = re.match(r"\s*([A-Z]+)\s*(\d{6})\s*\(([^)]+)\)", str(raw).strip())
    if not m:
        return None
    programme, intake, level = m.groups()
    return f"{programme}{intake}-{level.strip()}"


def clean_module(raw):
    m = re.match(r"\s*(.+?)\s*\((\d+)\)\s*$", str(raw).strip())
    if m:
        return m.group(1).strip(), int(m.group(2))
    return str(raw).strip(), None


def clean_lecturer(raw):
    name = str(raw or "").split("/")[0].strip()
    return LECTURER_ALIASES.get(name.lower(), name)


def guess_lab(module_name):
    low = module_name.lower()
    return any(k in low for k in LAB_KEYWORDS)


def _int(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _sessions(raw):
    """'2 (L + T)' -> 2"""
    m = re.match(r"\s*(\d+)", str(raw or ""))
    return int(m.group(1)) if m else 0


def parse(path, sheet="Template 2", programmes=None):
    """Build {groups, classes, skipped, warnings} from the Course Listing xlsx.

    programmes: optional tuple of prefixes to keep, e.g. ("BSCS", "BSSE", "BSAI").
                None keeps every programme in the file.
    """
    wb = load_workbook(path, read_only=True, data_only=True)
    if sheet not in wb.sheetnames:
        raise ValueError(f"Sheet '{sheet}' not found. Sheets: {', '.join(wb.sheetnames)}")
    ws = wb[sheet]

    groups, classes, skipped, warnings = {}, {}, [], []

    for row in ws.iter_rows(values_only=True):
        row = row[:LAST_USEFUL_COL + 1]          # drop student names
        if len(row) <= COL_LECTURER or not row[COL_GROUP]:
            continue

        group = clean_group(row[COL_GROUP])
        code = str(row[COL_CODE] or "").strip()
        if not group or not code or not row[COL_NAME]:
            continue
        if programmes and not any(group.startswith(p) for p in programmes):
            continue
        if code in SKIP_CODES:
            skipped.append((group, code))
            continue

        module, suffix = clean_module(row[COL_NAME])
        count = _int(row[COL_STUDENTS])
        groups.setdefault(group, count)

        weekly = _int(row[COL_HOURS], 0)
        if weekly <= 0:
            weekly = DEFAULT_WEEKLY_HOURS
            warnings.append(f"{code}: no hours given, defaulted to {weekly}h")

        n = _sessions(row[COL_LT])
        length = max(1, round(weekly / n)) if n else weekly

        c = classes.setdefault(code, {
            "id": code,
            "module": module,
            "groups": [],
            "students": 0,
            "lecturer": clean_lecturer(row[COL_LECTURER]),
            "weekly_hours": weekly,
            "session_length": length,
            "lab": guess_lab(module),
            "part_time": str(row[COL_FTPT] or "").strip().upper() == "PT",
        })
        if group not in c["groups"]:
            c["groups"].append(group)
            c["students"] += suffix if suffix else count

        if suffix is None:
            warnings.append(f"{code} / {group}: module name has no (n) suffix, "
                            f"used STUDENT NO = {count}")

    return {
        "groups": groups,
        "classes": sorted(classes.values(), key=lambda c: c["id"]),
        "skipped": skipped,
        "warnings": warnings,
    }
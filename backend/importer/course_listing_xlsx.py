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


# The Course Listing often names a lecturer only by staff code ("FT 9", "PT#1-CS") and
# sometimes writes the real name next to the code ("PT#1-CS Nikalus Swee Shu Luing").
_CODE = r"(?:FT|PT)\s*#?\s*\d+(?:-[A-Z]+)?|PT#\d+-[A-Z]+"
_PLACEHOLDER = re.compile(rf"^({_CODE})$", re.I)
_CODE_AND_NAME = re.compile(rf"^({_CODE})\s+(\S.*)$", re.I)


def is_placeholder(name):
    return bool(_PLACEHOLDER.match(str(name).strip()))


def split_code_name(raw):
    """'PT#1-CS Nikalus X' -> ('PT#1-CS', 'Nikalus X'); anything else -> (None, cleaned name)."""
    name = clean_lecturer(raw)
    m = _CODE_AND_NAME.match(name)
    return (m.group(1).strip(), m.group(2).strip()) if m else (None, name)


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

    # drop student names right away, keep only the useful columns
    try:
        rows = [r[:LAST_USEFUL_COL + 1] for r in ws.iter_rows(values_only=True)]
    finally:
        wb.close()      # Windows keeps the file locked until it is closed, so it could not be deleted

    # HOURS PER WEEK is often filled on only ONE row of a course (the other intake
    # groups of the same course leave it blank), so remember the first value per code.
    hours_by_code = {}
    for r in rows:
        if len(r) > COL_HOURS and r[COL_CODE] and _int(r[COL_HOURS]) > 0:
            hours_by_code.setdefault(str(r[COL_CODE]).strip(), _int(r[COL_HOURS]))
    no_hours = set()

    # Work out which real person is behind each staff code: when one course lists both
    # "FT 9" and "Kong Kok Wah @ Eric" (or "PT#1-CS Nikalus ..."), they are the same person.
    names_by_code, alias = {}, {}
    for r in rows:
        if len(r) > COL_LECTURER and r[COL_CODE] and r[COL_LECTURER]:
            code_, name_ = split_code_name(r[COL_LECTURER])
            if code_:
                alias.setdefault(code_.upper(), name_)
                name_ = code_
            names_by_code.setdefault(str(r[COL_CODE]).strip(), set()).add(name_)
    for names in names_by_code.values():
        placeholders = [n for n in names if is_placeholder(n)]
        real = [n for n in names if not is_placeholder(n)]
        if len(placeholders) == 1 and len(real) == 1:
            alias.setdefault(placeholders[0].upper(), real[0])

    def lecturer_of(raw):
        code_, name_ = split_code_name(raw)
        key = (code_ or name_).upper()
        return alias.get(key, name_ if not code_ else alias.get(code_.upper(), name_))

    for row in rows:
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
        group_students = _int(row[COL_STUDENTS])
        groups.setdefault(group, group_students)

        weekly = _int(row[COL_HOURS], 0) or hours_by_code.get(code, 0)
        if weekly <= 0:
            weekly = DEFAULT_WEEKLY_HOURS
            if code not in no_hours:                      # warn once per course
                no_hours.add(code)
                warnings.append(f"{code}: no hours given, defaulted to {weekly}h")

        n = _sessions(row[COL_LT])
        length = max(1, round(weekly / n)) if n else weekly

        c = classes.setdefault(code, {
            "id": code,
            "module": module,
            "groups": [],
            "students": 0,
            "lecturer": lecturer_of(row[COL_LECTURER]),
            "weekly_hours": weekly,
            "session_length": length,
            "lab": guess_lab(module),
            "part_time": str(row[COL_FTPT] or "").strip().upper() == "PT",
        })
        lecturer = lecturer_of(row[COL_LECTURER])
        if lecturer and lecturer != c["lecturer"] and not c.get("_lec_warned"):
            c["_lec_warned"] = True
            warnings.append(f"{code}: more than one lecturer in the file "
                            f"({c['lecturer']} / {lecturer}); kept {c['lecturer']}")
        if group not in c["groups"]:
            c["groups"].append(group)
            c["students"] += group_students                          # in the xlsx file: `+= count`

    for c in classes.values():
        c.pop("_lec_warned", None)

    return {
        "groups": groups,
        "classes": sorted(classes.values(), key=lambda c: c["id"]),
        "skipped": skipped,
        "warnings": warnings,
    }
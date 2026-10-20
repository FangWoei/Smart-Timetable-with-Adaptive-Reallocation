"""Pick the right importer for a file."""
from pathlib import Path

from importer import course_listing, course_listing_xlsx, generic


def detect(path):
    if Path(path).suffix.lower() in (".xlsx", ".xlsm"):
        return "xlsx"
    return "generic" if generic.looks_generic(path) else "asc"


def parse_any(path, programmes=None):
    """Parse a course file, choosing the format automatically."""
    fmt = detect(path)
    if fmt == "xlsx":
        result = course_listing_xlsx.parse(path, programmes=programmes)
    elif fmt == "generic":
        result = generic.parse(path)
    else:
        result = course_listing.parse(path)
    result["format"] = fmt
    return result
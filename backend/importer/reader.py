"""Pick the right importer for a file."""
from importer import course_listing, generic


def detect(path):
    return "generic" if generic.looks_generic(path) else "asc"


def parse_any(path):
    """Parse a course file, choosing the format automatically."""
    fmt = detect(path)
    result = generic.parse(path) if fmt == "generic" else course_listing.parse(path)
    result["format"] = fmt
    return result
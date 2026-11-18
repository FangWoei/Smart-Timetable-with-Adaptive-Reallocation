"""The Course Listing .xlsx importer, with a small made-up workbook (no real names)."""
import pytest
from openpyxl import Workbook

from importer import reader
from importer.course_listing_xlsx import parse


def row(group, students, code, name, lecturer, ftpt="FT", lt="2 (L + T)", hours=None):
    r = [None] * 26
    r[6], r[7], r[8] = group, students, "Y2S1"
    r[10], r[11], r[12], r[13] = code, name, lecturer, ftpt
    r[18], r[19] = lt, hours
    r[25] = "Secret Student Name"            # beyond the useful columns: must never be read
    return r


@pytest.fixture
def xlsx(tmp_path):
    wb = Workbook()
    ws = wb.active
    ws.title = "Template 2"
    for _ in range(3):
        ws.append([None] * 26)                                              # title + header rows
    ws.append(row("BSCS 202609 (L5)", 5, "MAL1", "Databases (1)", "FT 9", hours=4))
    ws.append(row("BSSE 202609 (L5)", 6, "MAL1", "Databases (1)", "Kong Kok Wah @ Eric"))   # hours blank
    ws.append(row("BSCS 202609 (L5)", 5, "MAL2", "Law (2)", "PT#1-CS Nikalus Swee Shu Luing", "PT"))
    ws.append(row("BSCS 202609 (L5)", 5, "MAL3", "Ethics (3)", "FT 8"))      # no hours anywhere
    ws.append(row("BSSE 202609 (L5)", 6, "MAL3", "Ethics (3)", "FT 8"))
    ws.append(row("BSCS 202609 (L5)", 5, "PCM3006", "Skipped (4)", "FT 1"))
    path = tmp_path / "listing.xlsx"
    wb.save(path)
    return path


def test_hours_are_carried_to_the_other_groups_of_a_course(xlsx):
    c = {c["id"]: c for c in parse(xlsx)["classes"]}
    assert c["MAL1"]["weekly_hours"] == 4 and c["MAL1"]["session_length"] == 2
    assert c["MAL1"]["groups"] == ["BSCS202609-L5", "BSSE202609-L5"] and c["MAL1"]["students"] == 11


def test_missing_hours_warn_once_per_course(xlsx):
    r = parse(xlsx)
    # MAL1 got its hours from another row; MAL2 and MAL3 have none (MAL3 has two rows but warns once)
    assert [w for w in r["warnings"] if "no hours" in w] == [
        "MAL2: no hours given, defaulted to 4h",
        "MAL3: no hours given, defaulted to 4h",
    ]


def test_staff_code_and_real_name_are_the_same_person(xlsx):
    c = {c["id"]: c for c in parse(xlsx)["classes"]}
    assert c["MAL1"]["lecturer"] == "Kong Kok Wah @ Eric"           # "FT 9" + the real name in the same course
    assert c["MAL2"]["lecturer"] == "Nikalus Swee Shu Luing" and c["MAL2"]["part_time"] is True


def test_skipped_courses_and_student_names(xlsx):
    r = parse(xlsx)
    assert r["skipped"] == [("BSCS202609-L5", "PCM3006")]
    assert "Secret Student Name" not in str(r)


def test_reader_picks_xlsx_by_extension(xlsx):
    assert reader.detect(xlsx) == "xlsx" and reader.parse_any(xlsx)["format"] == "xlsx"
"""Lecturer side: own timetable, availability, teaching hours. Admin: manage lecturers."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import current_user, require_admin
from app.deps import get_sb
from db.calendar import dated_timetable, get_active_semester, list_holidays
from db.lecturers import (
    add_lecturer, get_lecturer, get_unavailable, list_lecturers,
    remove_lecturer, set_part_time, set_unavailable, teaching_hours,
)
from db.users import create_user
from db.repository import get_active_timetable, log_action

router = APIRouter()


class AvailabilityIn(BaseModel):
    unavailable: list[list[int]]          # [[day, slot], ...]  day 1-5, slot 1-10


class LecturerIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str | None = Field(default=None, max_length=120)   # school email -> also lets them sign in
    is_part_time: bool = False


class LecturerPatch(BaseModel):
    is_part_time: bool


def _linked(sb, user):
    lec = get_lecturer(sb, user["lecturer_id"]) if user.get("lecturer_id") else None
    if lec is None:
        raise HTTPException(404, "This account is not linked to a lecturer.")
    return lec


def _existing(sb, lecturer_id):
    lec = get_lecturer(sb, lecturer_id)
    if lec is None:
        raise HTTPException(404, "Lecturer not found")
    return lec


def _availability(sb, lec):
    return {"lecturer_id": lec["id"], "name": lec["name"],
            "is_part_time": lec["is_part_time"],
            "unavailable": get_unavailable(sb, lec["id"])}


def _timetable_of(sb, lec, dated=False):
    tt = get_active_timetable(sb)
    if tt is None:
        raise HTTPException(404, "No active timetable yet.")
    entries = [e for e in tt["entries"] if e["lecturer"] == lec["name"]]
    if dated:
        semester = get_active_semester(sb)
        if semester is None:
            raise HTTPException(404, "No semester dates yet.")
        holidays = list_holidays(sb, semester["start_date"], semester["end_date"])
        entries = dated_timetable(entries, semester, holidays)
    return {"lecturer": lec["name"], "run": tt["run"], "entries": entries}


def _hours_of(sb, lec):
    tt = get_active_timetable(sb)
    entries = [e for e in tt["entries"] if e["lecturer"] == lec["name"]] if tt else []
    semester = get_active_semester(sb)
    holidays = list_holidays(sb, semester["start_date"], semester["end_date"]) if semester else []
    return {"lecturer": lec["name"], **teaching_hours(entries, semester, holidays)}


def _save_availability(sb, lec, body, actor):
    try:
        set_unavailable(sb, lec["id"], body.unavailable)
    except ValueError as e:
        raise HTTPException(400, str(e))
    log_action(sb, "set_availability",
               {"lecturer_id": lec["id"], "blocked": len(body.unavailable)}, actor)
    return _availability(sb, lec)


# ---------- THE SIGNED-IN LECTURER ----------
@router.get("/me/timetable")
def my_timetable(dated: bool = False, sb=Depends(get_sb), user=Depends(current_user)):
    return _timetable_of(sb, _linked(sb, user), dated)


@router.get("/me/hours")
def my_hours(sb=Depends(get_sb), user=Depends(current_user)):
    return _hours_of(sb, _linked(sb, user))


@router.get("/me/availability")
def my_availability(sb=Depends(get_sb), user=Depends(current_user)):
    return _availability(sb, _linked(sb, user))


@router.put("/me/availability")
def save_my_availability(body: AvailabilityIn, sb=Depends(get_sb), user=Depends(current_user)):
    lec = _linked(sb, user)
    if not lec["is_part_time"]:
        raise HTTPException(400, "Only part-time lecturers set their available times.")
    return _save_availability(sb, lec, body, user["email"])


# ---------- ADMIN ----------
@router.get("/lecturers", dependencies=[Depends(require_admin)])
def read_lecturers(sb=Depends(get_sb)):
    return list_lecturers(sb)


@router.post("/lecturers", status_code=201, dependencies=[Depends(require_admin)])
def create_lecturer(body: LecturerIn, sb=Depends(get_sb), admin=Depends(current_user)):
    try:
        if body.email and body.email.strip():
            # Same path as Users: creates the lecturer AND the invite-only login.
            create_user(sb, body.email, "lecturer", body.name.strip(), body.is_part_time)
            row = next(l for l in list_lecturers(sb) if l["name"] == " ".join(body.name.split()))
        else:
            row = add_lecturer(sb, body.name, body.is_part_time)
            row = next(l for l in list_lecturers(sb) if l["id"] == row["id"])
    except ValueError as e:
        raise HTTPException(400, str(e))
    log_action(sb, "lecturer_added", {"lecturer_id": row["id"], "name": row["name"]}, admin["email"])
    return row


@router.delete("/lecturers/{lecturer_id}", dependencies=[Depends(require_admin)])
def delete_lecturer(lecturer_id: int, sb=Depends(get_sb), admin=Depends(current_user)):
    row = remove_lecturer(sb, lecturer_id)
    if row is None:
        raise HTTPException(404, "Lecturer not found")
    log_action(sb, "lecturer_removed", {"lecturer_id": lecturer_id, "name": row["name"]}, admin["email"])
    return {"ok": True}


@router.patch("/lecturers/{lecturer_id}", dependencies=[Depends(require_admin)])
def edit_lecturer(lecturer_id: int, body: LecturerPatch, sb=Depends(get_sb),
                  admin=Depends(current_user)):
    row = set_part_time(sb, lecturer_id, body.is_part_time)
    if row is None:
        raise HTTPException(404, "Lecturer not found")
    log_action(sb, "set_part_time",
               {"lecturer_id": lecturer_id, "is_part_time": body.is_part_time}, admin["email"])
    return row


@router.get("/lecturers/{lecturer_id}/availability", dependencies=[Depends(require_admin)])
def read_availability(lecturer_id: int, sb=Depends(get_sb)):
    return _availability(sb, _existing(sb, lecturer_id))


@router.put("/lecturers/{lecturer_id}/availability", dependencies=[Depends(require_admin)])
def save_availability(lecturer_id: int, body: AvailabilityIn, sb=Depends(get_sb),
                      admin=Depends(current_user)):
    return _save_availability(sb, _existing(sb, lecturer_id), body, admin["email"])


@router.get("/lecturers/{lecturer_id}/timetable", dependencies=[Depends(require_admin)])
def read_lecturer_timetable(lecturer_id: int, dated: bool = False, sb=Depends(get_sb)):
    return _timetable_of(sb, _existing(sb, lecturer_id), dated)


@router.get("/lecturers/{lecturer_id}/hours", dependencies=[Depends(require_admin)])
def read_lecturer_hours(lecturer_id: int, sb=Depends(get_sb)):
    return _hours_of(sb, _existing(sb, lecturer_id))
"""Draft / publish, and Excel / PDF export."""
import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from app import exports
from app.auth import current_user
from app.deps import get_sb
from app.lecturer_routes import _linked
from app.unplaced_routes import find_unplaced
from db.repository import (
    delete_run, get_active_timetable, get_published_timetable, log_action, publish_run,
    unpublish_all,
)

router = APIRouter()


class PublishIn(BaseModel):
    force: bool = False          # publish even if some lessons are still unplaced


# ---------- DRAFT / PUBLISH ----------
@router.get("/timetable/status")
def status(sb=Depends(get_sb)):
    active, published = get_active_timetable(sb), get_published_timetable(sb)
    unplaced = len(find_unplaced(sb, tt=active)[2]) if active else 0
    return {
        "active_run_id": active["run"]["id"] if active else None,
        "published_run_id": published["run"]["id"] if published else None,
        "published_at": published["run"].get("published_at") if published else None,
        "active_is_published": bool(active and active["run"].get("is_published")),
        "unplaced": unplaced,
    }


@router.post("/timetable/publish")
def publish(body: PublishIn | None = None, sb=Depends(get_sb), admin=Depends(current_user)):
    """Make the active timetable the one lecturers can see."""
    body = body or PublishIn()
    tt = get_active_timetable(sb)
    if tt is None:
        raise HTTPException(404, "No active timetable yet. Generate one first.")
    unplaced = find_unplaced(sb, tt=tt)[2]
    if unplaced and not body.force:
        raise HTTPException(409, {"message": f"{len(unplaced)} lesson(s) are still unplaced.",
                                  "unplaced": len(unplaced)})
    row = publish_run(sb, tt["run"]["id"])
    log_action(sb, "publish_timetable", {"run_id": row["id"], "unplaced": len(unplaced)},
               admin["email"])
    return {"published_run_id": row["id"], "published_at": row["published_at"],
            "unplaced": len(unplaced)}


@router.post("/timetable/unpublish")
def unpublish(sb=Depends(get_sb), admin=Depends(current_user)):
    unpublish_all(sb)
    log_action(sb, "unpublish_timetable", None, admin["email"])
    return {"published_run_id": None}


@router.delete("/runs/{run_id}")
def remove_run(run_id: int, sb=Depends(get_sb), admin=Depends(current_user)):
    """Throw a plan away. Needed when you do not want a generated timetable."""
    result = delete_run(sb, run_id)
    if result is None:
        raise HTTPException(404, "That plan does not exist.")
    log_action(sb, "delete_run", result, admin["email"])
    return result


# ---------- EXPORT ----------
def _file(kind, name, title, sections, show):
    data = exports.build(kind, title, sections, show)
    safe = re.sub(r"[^A-Za-z0-9_.-]+", "_", name).strip("_") or "timetable"
    return Response(data, media_type=exports.MEDIA[kind],
                    headers={"Content-Disposition": f'attachment; filename="{safe}.{kind}"'})


@router.get("/export/timetable.{kind}")
def export_timetable(kind: Literal["xlsx", "pdf"], group: str | None = None,
                     lecturer: str | None = None, published: bool = False,
                     sb=Depends(get_sb)):
    """Admin: the whole timetable (one sheet/page per group), or one group / one lecturer.
    published=true exports what lecturers see instead of the working draft."""
    tt = get_published_timetable(sb) if published else get_active_timetable(sb)
    if tt is None:
        raise HTTPException(404, "No timetable to export yet.")
    entries = tt["entries"]

    if lecturer:
        mine = [e for e in entries if e["lecturer"] == lecturer]
        return _file(kind, f"timetable_{lecturer}", "Lecturer timetable",
                     {lecturer: mine}, "lecturer")
    sections = exports.split_by(entries, "group")
    if group:
        if group not in sections:
            raise HTTPException(404, f"No classes for group {group}")
        sections = {group: sections[group]}
        return _file(kind, f"timetable_{group}", "Group timetable", sections, "group")
    return _file(kind, "timetable_all_groups", "Group timetable", sections, "group")


@router.get("/me/timetable.{kind}")
def export_my_timetable(kind: Literal["xlsx", "pdf"], sb=Depends(get_sb),
                        user=Depends(current_user)):
    """A lecturer's own published timetable as a file."""
    lec = _linked(sb, user)
    tt = get_published_timetable(sb)
    if tt is None:
        raise HTTPException(404, "The timetable has not been published yet.")
    mine = [e for e in tt["entries"] if e["lecturer"] == lec["name"]]
    return _file(kind, f"timetable_{lec['name']}", "Lecturer timetable",
                 {lec["name"]: mine}, "lecturer")
"""Build Excel and PDF files from timetable entries (as returned by get_*_timetable)."""
import io
import re
from xml.sax.saxutils import escape

from solver.engine import SLOTS, slot_time

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]


def slot_label(slot):                       # slot is 1-based
    return f"{slot_time(slot - 1)}-{slot_time(slot)}"


def cell_text(e, show):
    """show = 'group' (timetable of a group) or 'lecturer' (timetable of a lecturer)."""
    who = e["lecturer"] or "No lecturer" if show == "group" else ", ".join(e["groups"])
    return f"{e['module']}\n{e['room']}\n{who}"


def grid_of(entries):
    """{(day, start_slot): entry}"""
    return {(e["day"], e["start_slot"]): e for e in entries}


def split_by(entries, key):
    """{name: [entries]} sorted by name. key = 'group' or 'lecturer'."""
    out = {}
    for e in entries:
        names = e["groups"] if key == "group" else [e["lecturer"] or "No lecturer"]
        for n in names:
            out.setdefault(n, []).append(e)
    return dict(sorted(out.items()))


def _sheet_name(name, used):
    base = re.sub(r"[\[\]:*?/\\]", "-", name)[:28] or "Sheet"
    n, i = base, 2
    while n in used:
        n = f"{base[:25]}_{i}"
        i += 1
    used.add(n)
    return n


# ---------- EXCEL ----------
def build_xlsx(title, sections, show):
    """sections = {name: entries}. One weekly-grid sheet per name, plus a list sheet."""
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

    thin = Side(style="thin", color="999999")
    box = Border(left=thin, right=thin, top=thin, bottom=thin)
    head_fill = PatternFill("solid", fgColor="1F3A5F")
    cell_fill = PatternFill("solid", fgColor="DCE9F7")

    wb = Workbook()
    wb.remove(wb.active)
    used = set()

    for name, entries in sections.items():
        ws = wb.create_sheet(_sheet_name(name, used))
        ws["A1"] = f"{title}: {name}"
        ws["A1"].font = Font(bold=True, size=14)
        ws.append([])
        ws.append(["Time"] + DAY_NAMES)
        for c in ws[3]:
            c.font = Font(bold=True, color="FFFFFF")
            c.fill = head_fill
            c.alignment = Alignment(horizontal="center")
            c.border = box
        for slot in range(1, SLOTS + 1):
            ws.append([slot_label(slot)])
            ws.row_dimensions[3 + slot].height = 48
            ws.cell(3 + slot, 1).border = box
        for e in entries:
            r, c = 3 + e["start_slot"], 1 + e["day"]
            ws.cell(r, c, cell_text(e, show))
            if e["hours"] > 1:
                ws.merge_cells(start_row=r, start_column=c,
                               end_row=r + e["hours"] - 1, end_column=c)
            for rr in range(r, r + e["hours"]):
                ws.cell(rr, c).border = box
                ws.cell(rr, c).fill = cell_fill
            ws.cell(r, c).alignment = Alignment(wrap_text=True, vertical="top")
        ws.column_dimensions["A"].width = 14
        for col in "BCDEF":
            ws.column_dimensions[col].width = 26

    ws = wb.create_sheet(_sheet_name("All classes", used))
    ws.append(["Group(s)", "Module", "Day", "Start", "End", "Room", "Lecturer", "Locked"])
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = head_fill
    seen = {}
    for entries in sections.values():
        for e in entries:
            seen[e["entry_id"]] = e
    for e in sorted(seen.values(), key=lambda e: (e["day"], e["start_slot"], e["module"])):
        ws.append([", ".join(e["groups"]), e["module"], DAY_NAMES[e["day"] - 1],
                   e["start_time"], e["end_time"], e["room"], e["lecturer"] or "",
                   "yes" if e["locked"] else ""])
    for col, w in zip("ABCDEFGH", (18, 40, 12, 8, 8, 14, 24, 8)):
        ws.column_dimensions[col].width = w

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ---------- PDF ----------
def build_pdf(title, sections, show):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    styles = getSampleStyleSheet()
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=7, leading=8.5)
    head = ParagraphStyle("head", parent=styles["Normal"], fontSize=8, textColor=colors.white,
                          alignment=1)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=10 * mm, rightMargin=10 * mm,
                            topMargin=10 * mm, bottomMargin=10 * mm, title=title)
    story = []
    for i, (name, entries) in enumerate(sections.items()):
        if i:
            story.append(PageBreak())
        story.append(Paragraph(f"<b>{escape(title)}: {escape(name)}</b>", styles["Heading2"]))
        story.append(Spacer(1, 3 * mm))

        data = [[Paragraph("Time", head)] + [Paragraph(d, head) for d in DAY_NAMES]]
        for slot in range(1, SLOTS + 1):
            data.append([Paragraph(slot_label(slot), small)] + [""] * 5)
        style = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F3A5F")),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]
        for e in entries:
            r, c = e["start_slot"], e["day"]
            text = "<br/>".join(escape(p) for p in cell_text(e, show).split("\n"))
            data[r][c] = Paragraph(f"<b>{text.split('<br/>')[0]}</b><br/>" +
                                   "<br/>".join(text.split("<br/>")[1:]), small)
            if e["hours"] > 1:
                style.append(("SPAN", (c, r), (c, r + e["hours"] - 1)))
            style.append(("BACKGROUND", (c, r), (c, r + e["hours"] - 1), colors.HexColor("#DCE9F7")))
        t = Table(data, colWidths=[28 * mm] + [49 * mm] * 5, rowHeights=[7 * mm] + [14 * mm] * SLOTS)
        t.setStyle(TableStyle(style))
        story.append(t)

    if not sections:
        story.append(Paragraph("No classes to show.", styles["Normal"]))
    doc.build(story)
    return buf.getvalue()


MEDIA = {
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pdf": "application/pdf",
}


def build(kind, title, sections, show):
    return build_xlsx(title, sections, show) if kind == "xlsx" else build_pdf(title, sections, show)
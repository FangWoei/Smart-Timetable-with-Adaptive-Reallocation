"""Malaysian public holidays and semester dates.

Holidays come from the `holidays` package (offline, no API key) and are
generated per state. Rows the admin adds by hand (source='manual') are
never overwritten by a regenerate.
"""
import holidays

DEFAULT_STATE = "PNG"        # Penang — Georgetown campus


def generate_holidays(year, state=DEFAULT_STATE, language="en_US"):
    """Return [{'date','name'}] of Malaysian public holidays for one year."""
    cal = holidays.Malaysia(years=year, subdiv=state, language=language)
    return [{"date": d.isoformat(), "name": name} for d, name in sorted(cal.items())]


def sync_holidays(sb, year, state=DEFAULT_STATE):
    """Generate holidays and save them, leaving manual entries alone."""
    generated = generate_holidays(year, state)

    existing = (sb.table("holidays")
                  .select("holiday_date, source")
                  .gte("holiday_date", f"{year}-01-01")
                  .lte("holiday_date", f"{year}-12-31")
                  .execute().data)
    manual = {r["holiday_date"] for r in existing if r["source"] == "manual"}

    rows = [{"holiday_date": h["date"], "name": h["name"], "source": "auto"}
            for h in generated if h["date"] not in manual]
    if rows:
        sb.table("holidays").upsert(rows, on_conflict="holiday_date").execute()

    return {"generated": len(generated), "saved": len(rows), "kept_manual": len(manual)}


def list_holidays(sb, start=None, end=None):
    q = sb.table("holidays").select("*").order("holiday_date")
    if start:
        q = q.gte("holiday_date", start)
    if end:
        q = q.lte("holiday_date", end)
    return q.execute().data


def add_holiday(sb, date, name, is_teaching_day=False, note=None):
    """Admin adds a school closure. Always stored as manual."""
    return sb.table("holidays").upsert({
        "holiday_date": date,
        "name": name,
        "source": "manual",
        "is_teaching_day": is_teaching_day,
        "note": note,
    }, on_conflict="holiday_date").execute().data[0]


def delete_holiday(sb, date):
    sb.table("holidays").delete().eq("holiday_date", date).execute()


# ---------- SEMESTERS ----------
def list_semesters(sb):
    return sb.table("semesters").select("*").order("start_date", desc=True).execute().data


def save_semester(sb, code, name, start_date, end_date, make_active=True):
    if make_active:
        sb.table("semesters").update({"is_active": False}).eq("is_active", True).execute()
    return sb.table("semesters").upsert({
        "code": code, "name": name,
        "start_date": start_date, "end_date": end_date,
        "is_active": make_active,
    }, on_conflict="code").execute().data[0]


def get_active_semester(sb):
    rows = sb.table("semesters").select("*").eq("is_active", True).execute().data
    return rows[0] if rows else None
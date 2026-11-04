"""Accounts. The admin adds a person here; that is what lets them sign in."""
DOMAIN = "@peninsulamalaysia.edu.my"


def list_users(sb):
    rows = (sb.table("allowed_users")
              .select("id, email, role, lecturer_id, last_login, note, "
                      "lecturers(name, is_part_time)")
              .order("email").execute().data)
    return [{
        "id": r["id"], "email": r["email"], "role": r["role"],
        "lecturer_id": r["lecturer_id"],
        "lecturer_name": r["lecturers"]["name"] if r["lecturers"] else None,
        "is_part_time": r["lecturers"]["is_part_time"] if r["lecturers"] else None,
        "last_login": r["last_login"], "note": r["note"],
    } for r in rows]


def _lecturer_id(sb, name, is_part_time):
    found = sb.table("lecturers").select("id").eq("name", name).execute().data
    if found:
        sb.table("lecturers").update({"is_part_time": is_part_time}).eq("id", found[0]["id"]).execute()
        return found[0]["id"]
    return sb.table("lecturers").insert(
        {"name": name, "is_part_time": is_part_time}).execute().data[0]["id"]


def create_user(sb, email, role, lecturer_name=None, is_part_time=False,
                password=None, note=None):
    email = email.strip().lower()
    if not email.endswith(DOMAIN):
        raise ValueError(f"Email must end with {DOMAIN}")
    if sb.table("allowed_users").select("id").eq("email", email).execute().data:
        raise ValueError("This email is already added")
    if role == "lecturer" and not lecturer_name:
        raise ValueError("A lecturer account needs the lecturer's name")

    lecturer_id = _lecturer_id(sb, lecturer_name, is_part_time) if lecturer_name else None
    row = sb.table("allowed_users").insert({
        "email": email, "role": role, "lecturer_id": lecturer_id, "note": note,
    }).execute().data[0]

    if password:   # email + password login; Microsoft login needs no password
        try:
            sb.auth.admin.create_user(
                {"email": email, "password": password, "email_confirm": True})
        except Exception as e:
            sb.table("allowed_users").delete().eq("id", row["id"]).execute()
            raise ValueError(f"Could not create the login: {e}")
    return row


def update_user(sb, user_id, role=None, is_part_time=None, note=None):
    rows = sb.table("allowed_users").select("id, role, lecturer_id").eq("id", user_id).execute().data
    if not rows:
        return None
    patch = {k: v for k, v in {"role": role, "note": note}.items() if v is not None}
    if patch:
        sb.table("allowed_users").update(patch).eq("id", user_id).execute()
    if is_part_time is not None and rows[0]["lecturer_id"]:
        sb.table("lecturers").update({"is_part_time": is_part_time}) \
          .eq("id", rows[0]["lecturer_id"]).execute()
    return rows[0]


def remove_user(sb, user_id, acting_email):
    """Remove access. Cannot remove yourself or the last admin."""
    rows = sb.table("allowed_users").select("id, email, role").eq("id", user_id).execute().data
    if not rows:
        return False
    if rows[0]["email"] == acting_email:
        raise ValueError("You cannot remove your own account")
    if rows[0]["role"] == "admin":
        admins = sb.table("allowed_users").select("id").eq("role", "admin").execute().data
        if len(admins) <= 1:
            raise ValueError("Cannot remove the last admin")
    sb.table("allowed_users").delete().eq("id", user_id).execute()
    return True
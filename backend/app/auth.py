"""Login check for the API.

The browser signs in with Supabase Auth (Microsoft or email + password) and
sends the access token with every request:  Authorization: Bearer <token>.
We ask Supabase who the token belongs to, then look that email up in the
allowed_users table (invite-only) to get the role.

Set AUTH_REQUIRED=true in backend/.env to turn this on. While it is off,
every request is treated as an admin (handy until the login page exists).
"""
import os
import time
from datetime import datetime, timezone
from functools import lru_cache

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from db.repository import get_client

DOMAIN = "@peninsulamalaysia.edu.my"
OPEN_PATHS = {"/health"}          # no login needed
CACHE_SECONDS = 60

bearer = HTTPBearer(auto_error=False)
_cache = {}                       # token -> (expires_at, user)
DEV_USER = {"email": "dev@local", "role": "admin", "lecturer_id": None}


def auth_required():
    return os.getenv("AUTH_REQUIRED", "false").strip().lower() == "true"


@lru_cache
def _client():
    return get_client()


def identify(token):
    """Turn a Supabase token into {'email', 'role', 'lecturer_id'} or raise."""
    hit = _cache.get(token)
    if hit and hit[0] > time.time():
        return hit[1]

    sb = _client()
    try:
        result = sb.auth.get_user(token)
        email = ((result.user.email if result and result.user else "") or "").lower()
    except Exception:
        raise HTTPException(401, "Your session has expired. Please sign in again.")

    if not email.endswith(DOMAIN):
        raise HTTPException(403, "Only Peninsula school accounts can sign in.")

    rows = (sb.table("allowed_users")
              .select("id, email, role, lecturer_id")
              .eq("email", email).execute().data)
    if not rows:
        raise HTTPException(403, "This account has not been added yet. Ask an admin.")

    row = rows[0]
    user = {"email": email, "role": row["role"], "lecturer_id": row["lecturer_id"]}

    try:   # remember who signed in and when; never block a request on this
        sb.table("allowed_users").update({
            "user_id": result.user.id,
            "last_login": datetime.now(timezone.utc).isoformat(),
        }).eq("id", row["id"]).execute()
    except Exception:
        pass

    _cache[token] = (time.time() + CACHE_SECONDS, user)
    return user


def guard(request: Request, creds: HTTPAuthorizationCredentials | None = Depends(bearer)):
    """Runs before every route. Must be signed in; only admins may change data."""
    if (not auth_required() or request.method == "OPTIONS"
            or request.url.path in OPEN_PATHS):
        return
    if creds is None:
        raise HTTPException(401, "Please sign in.")
    user = identify(creds.credentials)
    request.state.user = user
    if request.method != "GET" and user["role"] != "admin":
        raise HTTPException(403, "Only an admin can do this.")


def current_user(request: Request):
    return getattr(request.state, "user", DEV_USER)


def require_admin(user=Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Only an admin can do this.")
    return user
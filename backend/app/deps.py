import threading

from db.repository import get_client

_local = threading.local()


def get_sb():
    """One Supabase client per worker thread. A single client shared by several
    requests at once can drop its connection ("Failed to fetch" in the browser)."""
    if getattr(_local, "sb", None) is None:
        _local.sb = get_client()
    return _local.sb
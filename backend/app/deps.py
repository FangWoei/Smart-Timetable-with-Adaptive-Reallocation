from functools import lru_cache

from db.repository import get_client


@lru_cache
def get_sb():
    """One shared Supabase client for all requests."""
    return get_client()
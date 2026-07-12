"""Supabase clients. Anon client for auth (signup/login); service client for
profile row reads/writes (scoped explicitly by the authenticated user_id)."""
from functools import lru_cache

from supabase import Client, create_client

from .config import get_settings


@lru_cache
def anon_client() -> Client:
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_anon_key)


@lru_cache
def service_client() -> Client:
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_role_key)

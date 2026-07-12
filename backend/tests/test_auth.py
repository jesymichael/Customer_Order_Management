"""Runnable checks with no network: validation rules + JWT middleware (COM-14).

Supabase (register/login/profile DB) is stubbed via dependency/client overrides.
"""
import datetime as dt

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

SECRET = "test-secret"


@pytest.fixture(autouse=True)
def _settings():
    get_settings.cache_clear()
    import os

    os.environ["SUPABASE_JWT_SECRET"] = SECRET
    yield
    get_settings.cache_clear()


client = TestClient(app, raise_server_exceptions=False)


def _token(sub="user-123", expired=False):
    now = dt.datetime.now(dt.timezone.utc)
    exp = now - dt.timedelta(hours=1) if expired else now + dt.timedelta(hours=24)
    return jwt.encode({"sub": sub, "aud": "authenticated", "exp": exp}, SECRET, algorithm="HS256")


# --- COM-14: JWT middleware ---
def test_missing_token_401():
    assert client.get("/api/auth/profile").status_code == 401


def test_bad_signature_401():
    bad = jwt.encode({"sub": "x", "aud": "authenticated"}, "wrong", algorithm="HS256")
    r = client.get("/api/auth/profile", headers={"Authorization": f"Bearer {bad}"})
    assert r.status_code == 401


def test_expired_token_401():
    r = client.get("/api/auth/profile", headers={"Authorization": f"Bearer {_token(expired=True)}"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "TOKEN_EXPIRED"


# --- COM-12/13: validation via envelope ---
def test_register_short_password_400():
    r = client.post("/api/auth/register", json={"email": "a@b.com", "password": "short"})
    assert r.status_code == 400
    assert r.json()["error"]["field"] == "password"


def test_register_bad_email_400():
    r = client.post("/api/auth/register", json={"email": "not-an-email", "password": "longenough"})
    assert r.status_code == 400
    assert r.json()["error"]["field"] == "email"


# --- COM-15: profile update validation (auth passes via valid token) ---
def test_profile_bad_phone_400():
    r = client.patch(
        "/api/auth/profile",
        headers={"Authorization": f"Bearer {_token()}"},
        json={"phone": "abc"},
    )
    assert r.status_code == 400
    assert r.json()["error"]["field"] == "phone"


def test_envelope_success_shape():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}

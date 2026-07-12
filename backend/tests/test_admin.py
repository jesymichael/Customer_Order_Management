"""Admin gate (require_admin). Non-admin / missing token short-circuit before DB."""
import datetime as dt
import os

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

SECRET = "test-secret"
client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def _env():
    get_settings.cache_clear()
    os.environ["SUPABASE_JWT_SECRET"] = SECRET
    os.environ["ADMIN_EMAILS"] = "boss@example.com"
    yield
    get_settings.cache_clear()


def _token(email: str):
    exp = dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=1)
    return jwt.encode(
        {"sub": "u1", "email": email, "aud": "authenticated", "exp": exp}, SECRET, algorithm="HS256"
    )


def test_admin_users_requires_token():
    assert client.get("/api/admin/users").status_code == 401


def test_admin_users_forbidden_for_non_admin():
    r = client.get("/api/admin/users", headers={"Authorization": f"Bearer {_token('user@example.com')}"})
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "FORBIDDEN"


def test_admin_product_create_forbidden_for_non_admin():
    r = client.post(
        "/api/admin/products",
        headers={"Authorization": f"Bearer {_token('user@example.com')}"},
        json={"name": "X", "price": 5},
    )
    assert r.status_code == 403

"""Order creation validation + auth guard (COM-22) and the 48h window (COM-26).
Validation/auth short-circuit before the create_order RPC, so no network."""
import datetime as dt
import os

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.core.time import is_editable, order_status
from app.main import app

SECRET = "test-secret"
client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def _secret():
    get_settings.cache_clear()
    os.environ["SUPABASE_JWT_SECRET"] = SECRET
    yield
    get_settings.cache_clear()


def _token():
    exp = dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=24)
    return jwt.encode({"sub": "u1", "aud": "authenticated", "exp": exp}, SECRET, algorithm="HS256")


def _auth():
    return {"Authorization": f"Bearer {_token()}"}


def test_create_requires_auth():
    assert client.post("/api/orders", json={"items": []}).status_code == 401


def test_create_empty_items_400():
    r = client.post("/api/orders", headers=_auth(), json={"items": []})
    assert r.status_code == 400


def test_create_zero_quantity_400():
    r = client.post(
        "/api/orders",
        headers=_auth(),
        json={"items": [{"product_id": "11111111-1111-1111-1111-111111111111", "quantity": 0}]},
    )
    assert r.status_code == 400


# --- COM-26: 48-hour runtime window ---
def test_window_editable_then_locked():
    now = dt.datetime(2026, 1, 3, tzinfo=dt.timezone.utc)
    assert is_editable(now - dt.timedelta(hours=47), now) is True
    assert is_editable(now - dt.timedelta(hours=48), now) is False
    assert is_editable(now - dt.timedelta(hours=49), now) is False


def test_order_status_string():
    fresh = dt.datetime.now(dt.timezone.utc).isoformat()
    old = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=50)).isoformat()
    assert order_status(fresh) == "EDITABLE"
    assert order_status(old) == "LOCKED"


# --- COM-27: quantity modification guards (short-circuit before RPC) ---
_OID = "11111111-1111-1111-1111-111111111111"
_IID = "22222222-2222-2222-2222-222222222222"


def test_modify_requires_auth():
    r = client.patch(f"/api/orders/{_OID}/items/{_IID}", json={"quantity": 2})
    assert r.status_code == 401


def test_modify_zero_quantity_400():
    r = client.patch(f"/api/orders/{_OID}/items/{_IID}", headers=_auth(), json={"quantity": 0})
    assert r.status_code == 400
    assert r.json()["error"]["field"] == "quantity"


def test_cancel_requires_auth():
    assert client.delete(f"/api/orders/{_OID}").status_code == 401


# --- COM-32 / COM-33: read endpoints require auth ---
def test_list_requires_auth():
    assert client.get("/api/orders").status_code == 401


def test_detail_requires_auth():
    assert client.get(f"/api/orders/{_OID}").status_code == 401

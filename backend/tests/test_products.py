"""Product seeding guard + validation (COM-18). These paths short-circuit
before any Supabase call, so no network/mock needed."""
import os

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def _admin_secret():
    get_settings.cache_clear()
    os.environ["ADMIN_SECRET"] = "s3cr3t"
    yield
    get_settings.cache_clear()


def test_seed_without_secret_403():
    r = client.post("/api/products", json={"name": "Widget", "price": 9.99})
    assert r.status_code == 403


def test_seed_wrong_secret_403():
    r = client.post(
        "/api/products",
        headers={"X-Admin-Secret": "nope"},
        json={"name": "Widget", "price": 9.99},
    )
    assert r.status_code == 403


def test_seed_non_positive_price_400():
    r = client.post(
        "/api/products",
        headers={"X-Admin-Secret": "s3cr3t"},
        json={"name": "Widget", "price": 0},
    )
    assert r.status_code == 400
    assert r.json()["error"]["field"] == "price"

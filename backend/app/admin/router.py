"""Admin management endpoints (users + products). Gated by require_admin:
the caller's JWT email must be in ADMIN_EMAILS. Not part of the v1 scope —
added for the management screens."""
from fastapi import APIRouter, Depends

from ..auth.dependencies import require_admin
from ..products.router import insert_product
from ..products.schemas import ProductCreate
from ..responses import ok
from ..supabase_client import service_client

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
def list_users(_: dict = Depends(require_admin)):
    res = (
        service_client()
        .table("profiles")
        .select("id,email,name,phone,created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return ok(res.data)


@router.post("/products")
def create_product(body: ProductCreate, _: dict = Depends(require_admin)):
    return ok(insert_product(body), status_code=201)

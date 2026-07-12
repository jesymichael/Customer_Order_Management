"""Product endpoints: seeding (COM-18, admin-only) and browse (COM-19, public)."""
from fastapi import APIRouter, Header

from ..config import get_settings
from ..responses import AppError, ok
from ..supabase_client import service_client
from .schemas import ProductCreate

try:
    from postgrest.exceptions import APIError
except ImportError:  # pragma: no cover
    from postgrest import APIError  # type: ignore

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("")
def list_products():
    # COM-19: public, full list, no pagination.
    res = service_client().table("products").select("id,name,price").order("name").execute()
    return ok(res.data)


def insert_product(body: ProductCreate) -> dict:
    """Insert a product; map a unique-name violation to 409. Shared by the CI
    secret endpoint and the admin management endpoint."""
    try:
        res = (
            service_client()
            .table("products")
            .insert({"name": body.name, "price": str(body.price)})
            .execute()
        )
    except APIError as exc:
        if getattr(exc, "code", None) == "23505" or "duplicate" in str(exc).lower():
            raise AppError("Product name already exists", 409, "DUPLICATE_NAME", "name") from exc
        raise AppError(str(exc), 400, "PRODUCT_CREATE_FAILED") from exc
    return res.data[0]


@router.post("")
def create_product(body: ProductCreate, x_admin_secret: str | None = Header(default=None)):
    settings = get_settings()
    # COM-18: CI seeding path, gated by the shared secret.
    if not settings.admin_secret or x_admin_secret != settings.admin_secret:
        raise AppError("Admin credentials required", 403, "FORBIDDEN")
    return ok(insert_product(body), status_code=201)

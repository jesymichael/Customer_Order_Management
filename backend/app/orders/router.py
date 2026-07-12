"""Order endpoints. Creation (COM-22) is atomic via the create_order SQL
function. All routes require a valid JWT (COM-14)."""
from fastapi import APIRouter, Depends

from ..auth.dependencies import get_current_user
from ..responses import Envelope, ok
from ..supabase_client import service_client
from .schemas import CreateOrderRequest, OrderResponse, OrderSummary, QuantityUpdate
from .service import map_pg_error, with_status

try:
    from postgrest.exceptions import APIError
except ImportError:  # pragma: no cover
    from postgrest import APIError  # type: ignore

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("", status_code=201, response_model=Envelope[OrderResponse])
def create_order(body: CreateOrderRequest, user_id: str = Depends(get_current_user)):
    items = [{"product_id": str(i.product_id), "quantity": i.quantity} for i in body.items]
    try:
        res = service_client().rpc(
            "create_order", {"p_user_id": user_id, "p_items": items}
        ).execute()
    except APIError as exc:
        raise map_pg_error(exc)
    return ok(with_status(res.data), status_code=201)


def _rpc(fn: str, params: dict):
    try:
        return service_client().rpc(fn, params).execute()
    except APIError as exc:
        raise map_pg_error(exc)


@router.get("", response_model=Envelope[list[OrderSummary]])
def list_orders(user_id: str = Depends(get_current_user)):
    # COM-32: user's orders, newest first (SQL), status computed at request time.
    res = _rpc("list_orders", {"p_user_id": user_id})
    return ok([with_status(o) for o in (res.data or [])])


@router.get("/{order_id}", response_model=Envelope[OrderResponse])
def get_order(order_id: str, user_id: str = Depends(get_current_user)):
    # COM-33: full order + modification history; 403 if not owner, 404 if missing.
    res = _rpc("get_order", {"p_user_id": user_id, "p_order_id": order_id})
    return ok(with_status(res.data))


@router.patch("/{order_id}/items/{item_id}", response_model=Envelope[OrderResponse])
def modify_quantity(
    order_id: str, item_id: str, body: QuantityUpdate, user_id: str = Depends(get_current_user)
):
    # COM-27: LOCKED -> 403, not-owner -> 403, missing -> 404 (mapped in _rpc).
    res = _rpc(
        "modify_item_quantity",
        {"p_user_id": user_id, "p_order_id": order_id, "p_item_id": item_id, "p_qty": body.quantity},
    )
    return ok(with_status(res.data))


@router.delete("/{order_id}/items/{item_id}", response_model=Envelope[OrderResponse])
def remove_item(order_id: str, item_id: str, user_id: str = Depends(get_current_user)):
    # COM-28: soft-delete; order may end with 0 items.
    res = _rpc("remove_item", {"p_user_id": user_id, "p_order_id": order_id, "p_item_id": item_id})
    return ok(with_status(res.data))


@router.delete("/{order_id}", response_model=Envelope[OrderResponse])
def cancel_order(order_id: str, user_id: str = Depends(get_current_user)):
    # COM-29: soft-delete all items + the order.
    res = _rpc("cancel_order", {"p_user_id": user_id, "p_order_id": order_id})
    return ok(with_status(res.data))

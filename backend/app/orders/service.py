"""Shared order helpers: map Postgres function errors to AppError, and attach
the runtime EDITABLE/LOCKED status (COM-26) to order payloads."""
from ..core.time import order_status
from ..responses import AppError

try:
    from postgrest.exceptions import APIError
except ImportError:  # pragma: no cover
    from postgrest import APIError  # type: ignore

# Prefix -> (status_code, code) for exceptions raised inside the SQL functions.
_PREFIX = {
    "NOT_FOUND": (404, "NOT_FOUND"),
    "VALIDATION": (400, "VALIDATION_ERROR"),
    "LOCKED": (403, "ORDER_LOCKED"),
    "FORBIDDEN": (403, "FORBIDDEN"),
}


def map_pg_error(exc: "APIError") -> AppError:
    msg = getattr(exc, "message", None) or str(exc)
    for prefix, (status, code) in _PREFIX.items():
        if prefix in msg:
            clean = msg.split(":", 1)[-1].strip() if ":" in msg else msg
            return AppError(clean, status, code)
    return AppError(msg, 400, "ORDER_ERROR")


def with_status(order: dict) -> dict:
    order["status"] = order_status(order["created_at"])
    return order

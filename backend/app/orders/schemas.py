"""Order request + response schemas (COM-22, COM-24). total_amount and
unit_price are serialized as strings to preserve NUMERIC precision (NFR-5)."""
import datetime as dt
from uuid import UUID

from pydantic import BaseModel, Field


# --- requests ---
class OrderItemInput(BaseModel):
    product_id: UUID
    quantity: int = Field(gt=0)  # FR-7: quantity >= 1


class CreateOrderRequest(BaseModel):
    items: list[OrderItemInput] = Field(min_length=1)  # at least 1 item


class QuantityUpdate(BaseModel):
    quantity: int = Field(gt=0)  # FR-11: cannot set to 0; use item removal


# --- responses (documented in OpenAPI) ---
class OrderItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    quantity: int
    unit_price: str
    is_deleted: bool
    created_at: dt.datetime


class ModificationEntry(BaseModel):
    id: UUID
    modification_type: str
    modified_at: dt.datetime
    item_id: UUID | None
    user_id: UUID
    old_value: dict | None
    new_value: dict | None


class OrderResponse(BaseModel):
    id: UUID
    order_number: int
    user_id: UUID
    status: str  # "EDITABLE" | "LOCKED"
    total_amount: str
    is_deleted: bool
    created_at: dt.datetime
    updated_at: dt.datetime
    items: list[OrderItemResponse]
    modification_history: list[ModificationEntry]


class OrderSummary(BaseModel):
    id: UUID
    order_number: int
    user_id: UUID
    status: str
    total_amount: str
    item_count: int
    is_deleted: bool
    created_at: dt.datetime
    updated_at: dt.datetime

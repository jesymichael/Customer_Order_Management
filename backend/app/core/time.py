"""48-hour modification window, calculated at request time (COM-26 / FR-10,
FR-14, FR-19). No background job — status is derived from created_at on read,
and the SQL modification functions enforce the same window on write."""
import datetime as dt

EDIT_WINDOW = dt.timedelta(hours=48)


def _parse(created_at: str | dt.datetime) -> dt.datetime:
    if isinstance(created_at, dt.datetime):
        d = created_at
    else:
        d = dt.datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d


def is_editable(created_at: str | dt.datetime, now: dt.datetime | None = None) -> bool:
    now = now or dt.datetime.now(dt.timezone.utc)
    return (now - _parse(created_at)) < EDIT_WINDOW


def order_status(created_at: str | dt.datetime) -> str:
    return "EDITABLE" if is_editable(created_at) else "LOCKED"

"""Auth endpoints: registration (COM-12), login (COM-13), profile (COM-15)."""
from fastapi import APIRouter, Depends

from ..responses import AppError, ok
from ..supabase_client import anon_client, service_client
from .dependencies import get_claims, get_current_user, is_admin
from .schemas import LoginRequest, ProfileUpdate, RegisterRequest

try:  # gotrue was renamed to supabase_auth in newer releases
    from supabase_auth.errors import AuthApiError
except ImportError:  # pragma: no cover
    from gotrue.errors import AuthApiError

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _session_payload(res) -> dict:
    session = res.session
    return {
        "id": res.user.id if res.user else None,
        "email": res.user.email if res.user else None,
        "jwt_token": session.access_token if session else None,
    }


@router.post("/register")
def register(body: RegisterRequest):
    try:
        res = anon_client().auth.sign_up(
            {"email": body.email, "password": body.password}
        )
    except AuthApiError as exc:
        if "already" in str(exc).lower():  # ponytail: gotrue message match; 409 on dup email
            raise AppError("Email already registered", 409, "EMAIL_EXISTS", "email") from exc
        raise AppError(str(exc), 400, "REGISTRATION_FAILED", "email") from exc
    # profiles row is created by the on_auth_user_created trigger (migration 0002).
    return ok(_session_payload(res), status_code=201)


@router.post("/login")
def login(body: LoginRequest):
    try:
        res = anon_client().auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except AuthApiError as exc:
        raise AppError("Invalid email or password", 401, "INVALID_CREDENTIALS") from exc
    return ok(_session_payload(res))


@router.get("/profile")
def get_profile(claims: dict = Depends(get_claims)):
    res = (
        service_client()
        .table("profiles")
        .select("id,email,name,phone")
        .eq("id", claims["sub"])
        .single()
        .execute()
    )
    return ok({**res.data, "is_admin": is_admin(claims)})


@router.patch("/profile")
def update_profile(body: ProfileUpdate, user_id: str = Depends(get_current_user)):
    fields = body.model_dump(exclude_none=True)
    table = service_client().table("profiles")
    if fields:
        # Scoped to the authenticated user only — a user can never touch another's row.
        table.update(fields).eq("id", user_id).execute()
    res = table.select("id,email,name,phone,updated_at").eq("id", user_id).single().execute()
    return ok(res.data)

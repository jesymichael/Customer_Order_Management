"""JWT validation middleware (COM-14 / FR-4, NFR-10).

Validates the Supabase-issued access token on every protected route: presence,
signature, and expiry. Supports both signing schemes Supabase uses:
  - ES256/RS256 (asymmetric) — verified against the project JWKS (cloud default)
  - HS256 (shared secret) — verified with SUPABASE_JWT_SECRET (local dev)
Exposes the token claims, the user_id (`sub`), and an admin gate.
"""
from functools import lru_cache

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..config import get_settings
from ..responses import AppError

# auto_error=False so a missing header raises our 401 envelope, not FastAPI's.
_bearer = HTTPBearer(auto_error=False)


@lru_cache
def _jwk_client() -> jwt.PyJWKClient:
    s = get_settings()
    # apikey header keeps the JWKS fetch working even if the endpoint gates it.
    return jwt.PyJWKClient(
        f"{s.supabase_url}/auth/v1/.well-known/jwks.json",
        headers={"apikey": s.supabase_anon_key},
    )


def get_claims(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    if creds is None or not creds.credentials:
        raise AppError("Missing authorization token", 401, "INVALID_TOKEN")
    token = creds.credentials
    settings = get_settings()
    try:
        alg = jwt.get_unverified_header(token).get("alg", "")
        if alg == "HS256":
            key: object = settings.supabase_jwt_secret
        elif alg in ("ES256", "RS256"):
            key = _jwk_client().get_signing_key_from_jwt(token).key
        else:
            raise AppError("Unsupported token algorithm", 401, "INVALID_TOKEN")
        # leeway tolerates minor clock skew between this host and Supabase
        # (a fresh token's iat can look future-dated locally -> ImmatureSignatureError).
        return jwt.decode(
            token, key, algorithms=[alg], audience=settings.jwt_audience, leeway=30
        )
    except AppError:
        raise
    except jwt.ExpiredSignatureError as exc:
        raise AppError("Token has expired", 401, "TOKEN_EXPIRED") from exc
    except Exception as exc:  # invalid signature, bad kid, JWKS fetch failure, etc.
        raise AppError("Invalid token", 401, "INVALID_TOKEN") from exc


def get_current_user(claims: dict = Depends(get_claims)) -> str:
    user_id = claims.get("sub")
    if not user_id:
        raise AppError("Invalid token", 401, "INVALID_TOKEN")
    return user_id


def is_admin(claims: dict) -> bool:
    # ponytail: admin gate opened to all users per request. Restore the two lines
    # below to re-gate by ADMIN_EMAILS.
    #   email = (claims.get("email") or "").lower()
    #   return bool(email) and email in get_settings().admin_email_set()
    return True


def require_admin(claims: dict = Depends(get_claims)) -> dict:
    if not is_admin(claims):
        raise AppError("Admin access required", 403, "FORBIDDEN")
    return claims

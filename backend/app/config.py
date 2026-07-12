from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    # HS256 secret Supabase signs access tokens with (Dashboard > Settings > API > JWT Secret).
    supabase_jwt_secret: str = ""
    jwt_audience: str = "authenticated"
    cors_origins: str = "http://localhost:3000"
    # Shared secret for the CI product seeding endpoint (COM-18).
    admin_secret: str = ""
    # Comma-separated emails granted admin access to the management screens.
    admin_emails: str = ""

    def admin_email_set(self) -> set[str]:
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()

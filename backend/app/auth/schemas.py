from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)  # FR-1: >= 8 chars


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class ProfileUpdate(BaseModel):
    # FR-3: name 1-100 chars; mobile 10-15 digits. All optional (partial update).
    name: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = Field(default=None, pattern=r"^\d{10,15}$")

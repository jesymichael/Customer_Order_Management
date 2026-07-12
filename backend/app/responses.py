"""Standard response envelope + error handling (NFR-14, NFR-15)."""
from typing import Any, Generic, TypeVar

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

T = TypeVar("T")


class ErrorObj(BaseModel):
    message: str
    field: str | None = None
    code: str | None = None


class Envelope(BaseModel, Generic[T]):
    """Documented response shape for OpenAPI (NFR-14). Runtime responses are
    emitted via ok()/error handlers as JSONResponse with this same shape."""

    status: str = "success"
    data: T | None = None
    error: ErrorObj | None = None


class AppError(Exception):
    def __init__(self, message: str, status_code: int, code: str, field: str | None = None):
        self.message = message
        self.status_code = status_code
        self.code = code
        self.field = field


def ok(data: Any, status_code: int = 200) -> JSONResponse:
    return JSONResponse({"status": "success", "data": data, "error": None}, status_code=status_code)


def _error_body(message: str, code: str, field: str | None) -> dict:
    return {"status": "error", "data": None, "error": {"message": message, "field": field, "code": code}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(_error_body(exc.message, exc.code, exc.field), status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in first["loc"] if p != "body")
        return JSONResponse(
            _error_body(first["msg"], "VALIDATION_ERROR", field or None), status_code=400
        )

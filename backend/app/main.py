from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .admin.router import router as admin_router
from .auth.router import router as auth_router
from .config import get_settings
from .orders.router import router as orders_router
from .products.router import router as products_router
from .responses import register_error_handlers

app = FastAPI(title="Customer Order Management API", version="0.1.0")

register_error_handlers(app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in get_settings().cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(auth_router)
app.include_router(products_router)
app.include_router(orders_router)
app.include_router(admin_router)


@app.get("/health")
def health():
    return {"status": "ok"}

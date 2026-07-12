# Customer Order Management

Full-stack scaffold: **FastAPI** backend + **Next.js** frontend + **Supabase** (Postgres + Auth).
Branch `COM-11-auth` implements **Epics 1–5** (COM-12 → COM-36): auth, product
catalog, order creation, 48-hour modification window, and history/audit trail.

## Layout

```
backend/            FastAPI app
  app/auth/         register, login, profile, JWT dependency
  app/products/     seeding (admin) + browse
  app/orders/       create / list / detail / modify / cancel
  app/core/time.py  48-hour window logic
  tests/            runnable pytest checks (no network)
supabase/migrations/ SQL: schema, triggers, RLS, order/history functions
frontend/           Next.js App Router (auth, products, orders + audit UI)
```

## Story mapping

| Story  | What                          | Where |
| ------ | ----------------------------- | ----- |
| COM-12 | Customer Registration         | `auth/router.py` `register`, `migrations/0002`, `app/register` |
| COM-13 | Customer Login                | `auth/router.py` `login`, `app/api/auth/login` (httpOnly cookie) |
| COM-14 | JWT Validation Middleware     | `auth/dependencies.py` |
| COM-15 | Profile Management            | `auth/router.py` profile, `app/profile` |
| COM-16 | Row-Level Security            | `migrations/0003_rls.sql` |
| COM-18/19 | Product seeding + browse   | `products/router.py` |
| COM-20 | Product list (frontend)       | `app/products`, `components/product-catalog.tsx` |
| COM-22/24 | Atomic order creation + schema | `migrations/0004`, `orders/router.py`, `orders/schemas.py` |
| COM-23 | Total immutability            | `migrations/0005` (trigger) |
| COM-26–30 | 48h modification window    | `migrations/0006`, `orders/router.py`, `core/time.py` |
| COM-32/33 | Order list + detail        | `migrations/0007`, `orders/router.py` |
| COM-34 | Append-only audit             | `migrations/0007` (trigger) |
| COM-35 | Modification metadata         | `migrations/0001` + order functions |
| COM-36 | Order history UI              | `app/orders`, `components/order-detail.tsx` |

Run migrations `0001`–`0007` in order in the Supabase SQL editor. Set an
`ADMIN_SECRET` (backend `.env`) to use the product seeding endpoint.

## Backend

```bash
cd backend
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
cp .env.example .env   # fill in Supabase keys
.venv/Scripts/pytest   # runnable checks
.venv/Scripts/uvicorn app.main:app --reload
```

**Supabase setup:** run the three files in `supabase/migrations/` in order (SQL editor),
disable email confirmation, and set access-token expiry to 86400s (see `backend/.env.example`).

## Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev   # http://localhost:3000
```

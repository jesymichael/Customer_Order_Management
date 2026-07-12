-- Core schema (Architecture ADR §2). profiles extends auth.users; order tables
-- are created here so RLS (migration 0003) has something to attach to.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text check (length(name) <= 100),
  phone text check (phone ~ '^\d{10,15}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  price numeric(10, 2) not null check (price > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  total_amount numeric(12, 2) not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_user_created on public.orders(user_id, created_at);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity int not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price > 0),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_order_items_order_id on public.order_items(order_id);

do $$ begin
  create type modification_type as enum
    ('QUANTITY_CHANGE', 'ITEM_REMOVED', 'ITEM_ADDED', 'ORDER_CANCELLED');
exception when duplicate_object then null;
end $$;

create table if not exists public.order_modification_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id uuid references public.order_items(id) on delete set null,
  modification_type modification_type not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  old_value jsonb,
  new_value jsonb,
  modified_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_modhist_order_modified
  on public.order_modification_history(order_id, modified_at);

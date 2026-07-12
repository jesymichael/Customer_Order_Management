-- ===== 0001_schema.sql =====
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

-- ===== 0002_auth_trigger.sql =====
-- COM-12: creating a Supabase auth user must create the matching profiles row.
-- A trigger keeps registration atomic without extra round-trips from the API.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep profiles.updated_at fresh on any update
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ===== 0003_rls.sql =====
-- COM-16: Row-Level Security on order tables (NFR-11). Users can only reach
-- their own rows; a query as a non-owner returns 0 rows, not an error.
-- The backend uses the service-role key, which bypasses RLS by design — these
-- policies are defense-in-depth for any client using a user JWT (anon key).

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_modification_history enable row level security;
alter table public.profiles enable row level security;

-- orders: owned directly via user_id
drop policy if exists orders_user_isolation on public.orders;
create policy orders_user_isolation on public.orders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- order_items: owned through the parent order
drop policy if exists order_items_user_isolation on public.order_items;
create policy order_items_user_isolation on public.order_items
  for all using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- modification history: owned through the parent order
drop policy if exists modhist_user_isolation on public.order_modification_history;
create policy modhist_user_isolation on public.order_modification_history
  for all using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- profiles: a user sees and edits only their own row (NFR-11)
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- ===== 0004_order_functions.sql =====
-- COM-21/22: atomic order creation. A plpgsql function runs in a single
-- transaction, so either every item is inserted or none are (FR-7). Also the
-- shared order_json() builder reused by the detail endpoint (COM-33).

-- Full order JSON: order + items (incl. soft-deleted) + modification history.
create or replace function public.order_json(p_order_id uuid)
returns jsonb
language sql stable
as $$
  select jsonb_build_object(
    'id', o.id,
    'user_id', o.user_id,
    'total_amount', o.total_amount::text,
    'is_deleted', o.is_deleted,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', oi.id, 'product_id', oi.product_id, 'quantity', oi.quantity,
        'unit_price', oi.unit_price::text, 'is_deleted', oi.is_deleted,
        'created_at', oi.created_at
      ) order by oi.created_at)
      from order_items oi where oi.order_id = o.id), '[]'::jsonb),
    'modification_history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id, 'modification_type', h.modification_type, 'modified_at', h.modified_at,
        'item_id', h.item_id, 'user_id', h.user_id,
        'old_value', h.old_value, 'new_value', h.new_value
      ) order by h.modified_at desc)
      from order_modification_history h where h.order_id = o.id), '[]'::jsonb)
  )
  from orders o where o.id = p_order_id;
$$;

create or replace function public.create_order(p_user_id uuid, p_items jsonb)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_pid uuid;
  v_qty int;
  v_price numeric(10,2);
begin
  if p_items is null or jsonb_array_length(p_items) < 1 then
    raise exception 'VALIDATION: at least one item is required';
  end if;

  -- Price snapshot + total, validating each product exists (FR-8, FR-9).
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;
    if v_qty < 1 then
      raise exception 'VALIDATION: quantity must be >= 1';
    end if;
    select price into v_price from products where id = v_pid;
    if v_price is null then
      raise exception 'NOT_FOUND: product % does not exist', v_pid;
    end if;
    v_total := v_total + v_price * v_qty;
  end loop;

  insert into orders (user_id, total_amount)
  values (p_user_id, v_total)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;
    select price into v_price from products where id = v_pid;
    insert into order_items (order_id, product_id, quantity, unit_price)
    values (v_order_id, v_pid, v_qty, v_price);
  end loop;

  -- Audit: one ITEM_ADDED entry per line with a full new_value snapshot (FR-16).
  insert into order_modification_history (order_id, item_id, modification_type, user_id, old_value, new_value)
  select v_order_id, oi.id, 'ITEM_ADDED', p_user_id, null,
         jsonb_build_object('quantity', oi.quantity, 'unit_price', oi.unit_price::text,
                            'product_id', oi.product_id, 'is_deleted', oi.is_deleted)
  from order_items oi where oi.order_id = v_order_id;

  return public.order_json(v_order_id);
end;
$$;

-- ===== 0005_order_total_immutable.sql =====
-- COM-23: orders.total_amount is a historical snapshot — it must never change
-- after creation (FR-9, NFR-8), even as items are modified. Enforced at the DB
-- layer so no code path (or manual UPDATE) can violate it.

create or replace function public.forbid_total_change()
returns trigger language plpgsql as $$
begin
  if new.total_amount is distinct from old.total_amount then
    raise exception 'IMMUTABLE: orders.total_amount cannot be changed after creation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_total_immutable on public.orders;
create trigger trg_orders_total_immutable
  before update on public.orders
  for each row execute function public.forbid_total_change();

-- keep orders.updated_at fresh (reuses touch_updated_at from migration 0002)
drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_order_items_updated_at on public.order_items;
create trigger trg_order_items_updated_at
  before update on public.order_items
  for each row execute function public.touch_updated_at();

-- ===== 0006_modification_functions.sql =====
-- Epic 4: order modification within the 48h window. Each function is atomic
-- (one transaction), enforces ownership + the window, soft-deletes only, and
-- appends an immutable audit row with before/after JSONB snapshots (FR-16/17).

-- Guard: order exists, is owned by the caller, and is still editable.
create or replace function public._guard_editable(p_user_id uuid, p_order_id uuid)
returns void language plpgsql as $$
declare v_owner uuid; v_created timestamptz;
begin
  select user_id, created_at into v_owner, v_created from orders where id = p_order_id;
  if v_owner is null then
    raise exception 'NOT_FOUND: order does not exist';
  end if;
  if v_owner <> p_user_id then
    raise exception 'FORBIDDEN: you do not own this order';
  end if;
  if (now() - v_created) >= interval '48 hours' then  -- COM-26/30
    raise exception 'LOCKED: order is locked and cannot be modified (created % ago)',
      justify_interval(now() - v_created);
  end if;
end;
$$;

create or replace function public._item_snapshot(p_item_id uuid)
returns jsonb language sql stable as $$
  select jsonb_build_object('quantity', quantity, 'unit_price', unit_price::text,
                            'product_id', product_id, 'is_deleted', is_deleted)
  from order_items where id = p_item_id;
$$;

-- COM-27: change an item's quantity.
create or replace function public.modify_item_quantity(
  p_user_id uuid, p_order_id uuid, p_item_id uuid, p_qty int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_old jsonb; v_new jsonb;
begin
  if p_qty < 1 then
    raise exception 'VALIDATION: quantity must be >= 1';
  end if;
  perform public._guard_editable(p_user_id, p_order_id);

  select public._item_snapshot(id) into v_old
  from order_items where id = p_item_id and order_id = p_order_id and is_deleted = false
  for update;
  if v_old is null then
    raise exception 'NOT_FOUND: order item does not exist';
  end if;

  update order_items set quantity = p_qty where id = p_item_id;
  v_new := public._item_snapshot(p_item_id);

  insert into order_modification_history (order_id, item_id, modification_type, user_id, old_value, new_value)
  values (p_order_id, p_item_id, 'QUANTITY_CHANGE', p_user_id, v_old, v_new);
  return public.order_json(p_order_id);
end;
$$;

-- COM-28: soft-delete a single item (order may end up with 0 items).
create or replace function public.remove_item(
  p_user_id uuid, p_order_id uuid, p_item_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_old jsonb;
begin
  perform public._guard_editable(p_user_id, p_order_id);

  select public._item_snapshot(id) into v_old
  from order_items where id = p_item_id and order_id = p_order_id and is_deleted = false
  for update;
  if v_old is null then
    raise exception 'NOT_FOUND: order item does not exist';
  end if;

  update order_items set is_deleted = true where id = p_item_id;

  insert into order_modification_history (order_id, item_id, modification_type, user_id, old_value, new_value)
  values (p_order_id, p_item_id, 'ITEM_REMOVED', p_user_id, v_old, public._item_snapshot(p_item_id));
  return public.order_json(p_order_id);
end;
$$;

-- COM-29: cancel the whole order — soft-delete all items + the order.
create or replace function public.cancel_order(p_user_id uuid, p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public._guard_editable(p_user_id, p_order_id);

  update order_items set is_deleted = true where order_id = p_order_id and is_deleted = false;
  update orders set is_deleted = true where id = p_order_id;

  insert into order_modification_history (order_id, item_id, modification_type, user_id, old_value, new_value)
  values (p_order_id, null, 'ORDER_CANCELLED', p_user_id, null, jsonb_build_object('is_deleted', true));
  return public.order_json(p_order_id);
end;
$$;

-- ===== 0007_history_functions.sql =====
-- Epic 5: order history + audit trail reads, and append-only enforcement.

-- COM-32: a user's orders as lightweight summaries, newest first. Soft-deleted
-- (cancelled) orders are included. item_count excludes removed items.
create or replace function public.list_orders(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row order by (row->>'created_at') desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', o.id, 'user_id', o.user_id, 'total_amount', o.total_amount::text,
      'is_deleted', o.is_deleted, 'created_at', o.created_at, 'updated_at', o.updated_at,
      'item_count', (select count(*) from order_items oi
                     where oi.order_id = o.id and oi.is_deleted = false)
    ) as row
    from orders o where o.user_id = p_user_id
  ) s;
$$;

-- COM-33: a single order (full items + history) with an ownership check.
create or replace function public.get_order(p_user_id uuid, p_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_owner uuid;
begin
  select user_id into v_owner from orders where id = p_order_id;
  if v_owner is null then
    raise exception 'NOT_FOUND: order does not exist';
  end if;
  if v_owner <> p_user_id then
    raise exception 'FORBIDDEN: you do not own this order';
  end if;
  return public.order_json(p_order_id);
end;
$$;

-- COM-34: modification history is append-only — block any UPDATE/DELETE so the
-- before/after snapshots are a tamper-proof audit log (NFR-9, FR-18).
create or replace function public.forbid_history_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'IMMUTABLE: order_modification_history is append-only';
end;
$$;

drop trigger if exists trg_history_append_only on public.order_modification_history;
create trigger trg_history_append_only
  before update or delete on public.order_modification_history
  for each row execute function public.forbid_history_mutation();


-- ===== 0008_order_number.sql =====
-- Human-friendly sequential order number shown in the UI. An identity column
-- backfills existing orders automatically (roughly creation order; the number
-- only needs to be unique + stable, not perfectly ordered).
-- ponytail: identity default is fine at this scale; switch to a formatted
-- sequence (e.g. ORD-YYYY-000001) only if the business needs it.
alter table public.orders
  add column if not exists order_number bigint generated by default as identity;

create unique index if not exists idx_orders_order_number
  on public.orders(order_number);

-- Re-expose order_number from the two read functions.
create or replace function public.order_json(p_order_id uuid)
returns jsonb
language sql stable
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'user_id', o.user_id,
    'total_amount', o.total_amount::text,
    'is_deleted', o.is_deleted,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', oi.id, 'product_id', oi.product_id, 'quantity', oi.quantity,
        'unit_price', oi.unit_price::text, 'is_deleted', oi.is_deleted,
        'created_at', oi.created_at
      ) order by oi.created_at)
      from order_items oi where oi.order_id = o.id), '[]'::jsonb),
    'modification_history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id, 'modification_type', h.modification_type, 'modified_at', h.modified_at,
        'item_id', h.item_id, 'user_id', h.user_id,
        'old_value', h.old_value, 'new_value', h.new_value
      ) order by h.modified_at desc)
      from order_modification_history h where h.order_id = o.id), '[]'::jsonb)
  )
  from orders o where o.id = p_order_id;
$$;

create or replace function public.list_orders(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row order by (row->>'created_at') desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', o.id, 'order_number', o.order_number, 'user_id', o.user_id,
      'total_amount', o.total_amount::text,
      'is_deleted', o.is_deleted, 'created_at', o.created_at, 'updated_at', o.updated_at,
      'item_count', (select count(*) from order_items oi
                     where oi.order_id = o.id and oi.is_deleted = false)
    ) as row
    from orders o where o.user_id = p_user_id
  ) s;
$$;

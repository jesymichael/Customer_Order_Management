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

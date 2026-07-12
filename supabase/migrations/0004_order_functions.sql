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

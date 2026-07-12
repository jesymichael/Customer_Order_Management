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

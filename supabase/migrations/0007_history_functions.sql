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

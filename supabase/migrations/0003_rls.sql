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

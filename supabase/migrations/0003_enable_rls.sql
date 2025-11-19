-- Seraphine – Row Level Security & Role Helpers
-- Enables RLS across operational tables and introduces helper functions for Clerk-backed auth.

create or replace function public.current_jwt_claims()
returns jsonb
language sql
stable
as $$
  select coalesce(
    nullif(coalesce(current_setting('request.jwt.claims', true), ''), '')::jsonb,
    '{}'::jsonb
  );
$$;

comment on function public.current_jwt_claims is 'Returns the decoded JWT claims supplied by Supabase (or Clerk-exchanged tokens).';

create or replace function public.current_clerk_id()
returns text
language sql
stable
as $$
  select nullif(
    coalesce(
      public.current_jwt_claims()->>'clerk_id',
      public.current_jwt_claims()->>'sub'
    ),
    ''
  );
$$;

comment on function public.current_clerk_id is 'Gets the Clerk user id from the current JWT (prefers clerk_id claim, falls back to sub).';

create or replace function public.current_app_user_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result uuid;
  clerk_identifier text := public.current_clerk_id();
begin
  if clerk_identifier is null then
    return null;
  end if;

  select id
  into result
  from public.users
  where clerk_id = clerk_identifier;

  return result;
end;
$$;

comment on function public.current_app_user_id is 'Maps the authenticated Clerk id to the internal users.id';

create or replace function public.current_user_role()
returns user_role
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result user_role;
begin
  select role
  into result
  from public.users
  where id = public.current_app_user_id();

  return result;
end;
$$;

comment on function public.current_user_role is 'Returns the current user_role inferred from users table.';

create or replace function public.has_pharmacy_role(p_pharmacy_id uuid, allowed_roles user_role[] default array['owner','staff','restricted']::user_role[])
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := public.current_app_user_id();
begin
  if uid is null or p_pharmacy_id is null or allowed_roles is null or array_length(allowed_roles, 1) is null then
    return false;
  end if;

  return exists (
    select 1
    from public.pharmacy_memberships pm
    where pm.pharmacy_id = p_pharmacy_id
      and pm.user_id = uid
      and pm.role = any(allowed_roles)
  );
end;
$$;

comment on function public.has_pharmacy_role is 'Checks whether the authenticated user has one of the allowed roles within the specified pharmacy.';

-- Helper for sale_items since it does not expose pharmacy_id directly.
create or replace function public.user_can_access_sale(sale_id uuid, allowed_roles user_role[] default array['owner','staff','restricted']::user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.sales s
      where s.id = sale_id
        and public.has_pharmacy_role(s.pharmacy_id, allowed_roles)
    ),
    false
  );
$$;

comment on function public.user_can_access_sale is 'Verifies membership rights for a sale via its pharmacy_id.';

alter table public.pharmacies enable row level security;
alter table public.users enable row level security;
alter table public.pharmacy_memberships enable row level security;
alter table public.suppliers enable row level security;
alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.cash_reconciliations enable row level security;

-- Users
create policy "Users can read their own profile" on public.users
for select
using (id = public.current_app_user_id());

create policy "Owners and staff can read pharmacy users" on public.users
for select
using (
  exists (
    select 1
    from public.pharmacy_memberships pm
    where pm.user_id = users.id
      and public.has_pharmacy_role(pm.pharmacy_id, array['owner','staff']::user_role[])
  )
);

create policy "Users can update their own profile" on public.users
for update
using (id = public.current_app_user_id())
with check (id = public.current_app_user_id());

-- Pharmacies
create policy "Pharmacy members can read their pharmacy" on public.pharmacies
for select
using (public.has_pharmacy_role(id, array['owner','staff','restricted']::user_role[]));

create policy "Pharmacy owners can update their pharmacy" on public.pharmacies
for update
using (public.has_pharmacy_role(id, array['owner']::user_role[]))
with check (public.has_pharmacy_role(id, array['owner']::user_role[]));

-- Pharmacy memberships
create policy "Members can view memberships in their pharmacy" on public.pharmacy_memberships
for select
using (
  public.has_pharmacy_role(pharmacy_id, array['owner','staff']::user_role[])
  or user_id = public.current_app_user_id()
);

create policy "Owners manage memberships" on public.pharmacy_memberships
for all
using (public.has_pharmacy_role(pharmacy_id, array['owner']::user_role[]))
with check (public.has_pharmacy_role(pharmacy_id, array['owner']::user_role[]));

-- Suppliers
create policy "Members can read suppliers" on public.suppliers
for select
using (public.has_pharmacy_role(pharmacy_id, array['owner','staff','restricted']::user_role[]));

create policy "Owners manage suppliers" on public.suppliers
for all
using (public.has_pharmacy_role(pharmacy_id, array['owner']::user_role[]))
with check (public.has_pharmacy_role(pharmacy_id, array['owner']::user_role[]));

-- Clients
create policy "Members can read clients" on public.clients
for select
using (public.has_pharmacy_role(pharmacy_id, array['owner','staff','restricted']::user_role[]));

create policy "Owners manage clients" on public.clients
for all
using (public.has_pharmacy_role(pharmacy_id, array['owner']::user_role[]))
with check (public.has_pharmacy_role(pharmacy_id, array['owner']::user_role[]));

-- Products
create policy "Members can read products" on public.products
for select
using (public.has_pharmacy_role(pharmacy_id, array['owner','staff','restricted']::user_role[]));

create policy "Owners manage products" on public.products
for all
using (public.has_pharmacy_role(pharmacy_id, array['owner']::user_role[]))
with check (public.has_pharmacy_role(pharmacy_id, array['owner']::user_role[]));

-- Sales
create policy "Members can read sales" on public.sales
for select
using (public.has_pharmacy_role(pharmacy_id, array['owner','staff','restricted']::user_role[]));

create policy "Owners and staff manage sales" on public.sales
for all
using (public.has_pharmacy_role(pharmacy_id, array['owner','staff']::user_role[]))
with check (public.has_pharmacy_role(pharmacy_id, array['owner','staff']::user_role[]));

-- Sale items
create policy "Members can read sale items" on public.sale_items
for select
using (public.user_can_access_sale(sale_id, array['owner','staff','restricted']::user_role[]));

create policy "Owners and staff manage sale items" on public.sale_items
for all
using (public.user_can_access_sale(sale_id, array['owner','staff']::user_role[]))
with check (public.user_can_access_sale(sale_id, array['owner','staff']::user_role[]));

-- Stock movements
create policy "Members can read stock movements" on public.stock_movements
for select
using (public.has_pharmacy_role(pharmacy_id, array['owner','staff']::user_role[]));

create policy "Owners and staff manage stock movements" on public.stock_movements
for all
using (public.has_pharmacy_role(pharmacy_id, array['owner','staff']::user_role[]))
with check (public.has_pharmacy_role(pharmacy_id, array['owner','staff']::user_role[]));

-- Cash reconciliations
create policy "Members can read cash reconciliations" on public.cash_reconciliations
for select
using (public.has_pharmacy_role(pharmacy_id, array['owner','staff']::user_role[]));

create policy "Owners and staff manage cash reconciliations" on public.cash_reconciliations
for all
using (public.has_pharmacy_role(pharmacy_id, array['owner','staff']::user_role[]))
with check (public.has_pharmacy_role(pharmacy_id, array['owner','staff']::user_role[]));

-- Update RPC helpers to enforce role checks before executing privileged logic.
create or replace function public.create_sale_with_items(
  p_pharmacy_id uuid,
  p_items jsonb,
  p_client_id uuid default null,
  p_created_by uuid default null,
  p_payment_type payment_type default 'cash',
  p_discount_percent numeric default 0,
  p_discount_amount numeric default 0,
  p_sale_date timestamptz default now(),
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sale_id uuid;
  item record;
  product_record record;
  unit_price numeric(12, 2);
  line_subtotal numeric(12, 2);
  line_discount numeric(12, 2);
  line_total numeric(12, 2);
  sale_subtotal numeric(12, 2) := 0;
  sale_line_discount_total numeric(12, 2) := 0;
  sale_line_total numeric(12, 2);
  sale_level_discount numeric(12, 2);
  sale_total numeric(12, 2);
  sale_item_id uuid;
begin
  if not public.has_pharmacy_role(p_pharmacy_id, array['owner','staff']::user_role[]) then
    raise exception 'You are not allowed to manage sales for this pharmacy' using errcode = '42501';
  end if;

  if p_pharmacy_id is null then
    raise exception 'pharmacy_id is required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'p_items must be a non-empty JSON array';
  end if;

  insert into public.sales (
    pharmacy_id,
    client_id,
    created_by,
    payment_type,
    subtotal,
    line_discount_total,
    discount_percent,
    discount_amount,
    total_after_discount,
    sale_date,
    notes
  )
  values (
    p_pharmacy_id,
    p_client_id,
    coalesce(p_created_by, public.current_app_user_id()),
    coalesce(p_payment_type, 'cash'),
    0,
    0,
    0,
    0,
    0,
    coalesce(p_sale_date, now()),
    p_notes
  )
  returning id into sale_id;

  for item in
    select
      (element ->> 'product_id')::uuid as product_id,
      coalesce((element ->> 'quantity')::numeric, 0) as quantity,
      nullif((element ->> 'unit_price')::numeric, 0) as unit_price,
      coalesce((element ->> 'discount_percent')::numeric, 0) as discount_percent,
      coalesce((element ->> 'discount_amount')::numeric, 0) as discount_amount
    from jsonb_array_elements(p_items) as element
  loop
    if item.product_id is null then
      raise exception 'Sale item is missing product_id';
    end if;

    if item.quantity <= 0 then
      raise exception 'Quantity must be greater than zero for product %', item.product_id;
    end if;

    select id, stock, sell_price
    into product_record
    from public.products
    where id = item.product_id
      and pharmacy_id = p_pharmacy_id
    for update;

    if not found then
      raise exception 'Product % not found for pharmacy %', item.product_id, p_pharmacy_id;
    end if;

    if product_record.stock < item.quantity then
      raise exception 'Insufficient stock for product %, available %, requested %', item.product_id, product_record.stock, item.quantity;
    end if;

    unit_price := coalesce(item.unit_price, product_record.sell_price);
    line_subtotal := unit_price * item.quantity;
    line_discount := line_subtotal * (item.discount_percent / 100) + item.discount_amount;
    if line_discount > line_subtotal then
      line_discount := line_subtotal;
    end if;
    line_total := line_subtotal - line_discount;

    sale_subtotal := sale_subtotal + line_subtotal;
    sale_line_discount_total := sale_line_discount_total + line_discount;

    update public.products
    set stock = product_record.stock - item.quantity
    where id = product_record.id;

    insert into public.sale_items (
      sale_id,
      product_id,
      quantity,
      unit_price,
      discount_percent,
      discount_amount,
      line_subtotal,
      line_total
    )
    values (
      sale_id,
      item.product_id,
      item.quantity,
      unit_price,
      item.discount_percent,
      item.discount_amount,
      line_subtotal,
      line_total
    )
    returning id into sale_item_id;

    insert into public.stock_movements (
      pharmacy_id,
      product_id,
      quantity,
      movement_type,
      reference_id,
      metadata
    )
    values (
      p_pharmacy_id,
      item.product_id,
      item.quantity * -1,
      'sale',
      sale_id,
      jsonb_build_object('sale_item_id', sale_item_id)
    );
  end loop;

  sale_line_total := greatest(sale_subtotal - sale_line_discount_total, 0);
  sale_level_discount := sale_line_total * (coalesce(p_discount_percent, 0) / 100) + coalesce(p_discount_amount, 0);
  if sale_level_discount > sale_line_total then
    sale_level_discount := sale_line_total;
  end if;
  sale_total := greatest(sale_line_total - sale_level_discount, 0);

  update public.sales
  set
    subtotal = sale_subtotal,
    line_discount_total = sale_line_discount_total,
    discount_percent = coalesce(p_discount_percent, 0),
    discount_amount = coalesce(p_discount_amount, 0),
    total_after_discount = sale_total,
    payment_type = coalesce(p_payment_type, 'cash'),
    sale_date = coalesce(p_sale_date, sale_date)
  where id = sale_id;

  return sale_id;
end;
$$;

create or replace function public.record_cash_reconciliation(
  p_pharmacy_id uuid,
  p_date date default null,
  p_opening_cash numeric default 0,
  p_system_cash_expected numeric default 0,
  p_actual_cash numeric default 0,
  p_notes text default null,
  p_closed_by uuid default null
)
returns public.cash_reconciliations
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.cash_reconciliations%rowtype;
  target_date date := coalesce(p_date, now()::date);
  discrepancy_value numeric(12, 2) := coalesce(p_actual_cash, 0) - coalesce(p_system_cash_expected, 0);
begin
  if not public.has_pharmacy_role(p_pharmacy_id, array['owner','staff']::user_role[]) then
    raise exception 'You are not allowed to manage cash reconciliations for this pharmacy' using errcode = '42501';
  end if;

  if p_pharmacy_id is null then
    raise exception 'pharmacy_id is required';
  end if;

  insert into public.cash_reconciliations (
    pharmacy_id,
    date,
    opening_cash,
    system_cash_expected,
    actual_cash,
    discrepancy,
    notes,
    closed_by
  )
  values (
    p_pharmacy_id,
    target_date,
    coalesce(p_opening_cash, 0),
    coalesce(p_system_cash_expected, 0),
    coalesce(p_actual_cash, 0),
    discrepancy_value,
    p_notes,
    coalesce(p_closed_by, public.current_app_user_id())
  )
  on conflict (pharmacy_id, date)
  do update set
    opening_cash = excluded.opening_cash,
    system_cash_expected = excluded.system_cash_expected,
    actual_cash = excluded.actual_cash,
    discrepancy = excluded.discrepancy,
    notes = excluded.notes,
    closed_by = excluded.closed_by,
    updated_at = now()
  returning *
  into result_row;

  return result_row;
end;
$$;

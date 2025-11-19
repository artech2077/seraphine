-- Seraphine – Automated historical fields & balance ledgers
-- Adds product history triggers, stock logging, and client/supplier balance recalculations.

do $$
begin
  create type client_balance_event_type as enum ('sale_credit', 'payment', 'adjustment');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type supplier_balance_event_type as enum ('purchase', 'payment', 'adjustment');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.client_balance_events (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  amount numeric(12, 2) not null,
  event_type client_balance_event_type not null,
  reference_table text,
  reference_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists client_balance_events_client_id_idx on public.client_balance_events(client_id);
create index if not exists client_balance_events_pharmacy_id_idx on public.client_balance_events(pharmacy_id);
create index if not exists client_balance_events_reference_idx on public.client_balance_events(reference_id);

create table if not exists public.supplier_balance_events (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  amount numeric(12, 2) not null,
  event_type supplier_balance_event_type not null,
  reference_table text,
  reference_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists supplier_balance_events_supplier_id_idx on public.supplier_balance_events(supplier_id);
create index if not exists supplier_balance_events_pharmacy_id_idx on public.supplier_balance_events(pharmacy_id);
create index if not exists supplier_balance_events_reference_idx on public.supplier_balance_events(reference_id);

create or replace function public.refresh_client_balance(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  latest_balance numeric(12, 2);
begin
  if p_client_id is null then
    return;
  end if;

  select coalesce(sum(amount), 0)
  into latest_balance
  from public.client_balance_events
  where client_id = p_client_id;

  update public.clients
  set balance = latest_balance
  where id = p_client_id;
end;
$$;

create or replace function public.refresh_supplier_balance(p_supplier_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  latest_balance numeric(12, 2);
begin
  if p_supplier_id is null then
    return;
  end if;

  select coalesce(sum(amount), 0)
  into latest_balance
  from public.supplier_balance_events
  where supplier_id = p_supplier_id;

  update public.suppliers
  set balance = latest_balance
  where id = p_supplier_id;
end;
$$;

create or replace function public.handle_client_balance_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_client_balance(new.client_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    if tg_op = 'DELETE' or new.client_id is distinct from old.client_id then
      perform public.refresh_client_balance(old.client_id);
    end if;
  end if;

  return null;
end;
$$;

create or replace function public.handle_supplier_balance_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_supplier_balance(new.supplier_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    if tg_op = 'DELETE' or new.supplier_id is distinct from old.supplier_id then
      perform public.refresh_supplier_balance(old.supplier_id);
    end if;
  end if;

  return null;
end;
$$;

create trigger client_balance_events_recalc
after insert or update or delete on public.client_balance_events
for each row execute function public.handle_client_balance_event();

create trigger supplier_balance_events_recalc
after insert or update or delete on public.supplier_balance_events
for each row execute function public.handle_supplier_balance_event();

alter table public.client_balance_events enable row level security;
alter table public.supplier_balance_events enable row level security;

create policy "Owners and staff can read client balance events" on public.client_balance_events
for select
using (public.has_pharmacy_role(pharmacy_id, array['owner','staff']::user_role[]));

create policy "Owners manage client balance events" on public.client_balance_events
for all
using (public.has_pharmacy_role(pharmacy_id, array['owner']::user_role[]))
with check (public.has_pharmacy_role(pharmacy_id, array['owner']::user_role[]));

create policy "Owners and staff can read supplier balance events" on public.supplier_balance_events
for select
using (public.has_pharmacy_role(pharmacy_id, array['owner','staff']::user_role[]));

create policy "Owners manage supplier balance events" on public.supplier_balance_events
for all
using (public.has_pharmacy_role(pharmacy_id, array['owner']::user_role[]))
with check (public.has_pharmacy_role(pharmacy_id, array['owner']::user_role[]));

create or replace function public.update_product_last_purchase(p_product_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  latest_purchase timestamptz;
begin
  if p_product_id is null then
    return;
  end if;

  select max(s.sale_date)
  into latest_purchase
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  where si.product_id = p_product_id;

  update public.products
  set last_purchase = latest_purchase
  where id = p_product_id;
end;
$$;

create or replace function public.handle_sale_item_last_purchase()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.update_product_last_purchase(new.product_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    if tg_op = 'DELETE' or new.product_id is distinct from old.product_id then
      perform public.update_product_last_purchase(old.product_id);
    end if;
  end if;

  return null;
end;
$$;

create trigger sale_items_last_purchase_trigger
after insert or update or delete on public.sale_items
for each row execute function public.handle_sale_item_last_purchase();

create or replace function public.is_delivery_movement(movement_type stock_movement_type, movement_qty numeric)
returns boolean
language sql
immutable
as $$
  select movement_type = 'restock'
    or (movement_type = 'adjustment' and movement_qty > 0);
$$;

create or replace function public.update_product_last_delivery(p_product_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  latest_delivery timestamptz;
begin
  if p_product_id is null then
    return;
  end if;

  select max(sm.created_at)
  into latest_delivery
  from public.stock_movements sm
  where sm.product_id = p_product_id
    and public.is_delivery_movement(sm.movement_type, sm.quantity);

  update public.products
  set last_delivery = latest_delivery
  where id = p_product_id;
end;
$$;

create or replace function public.handle_stock_movement_last_delivery()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if public.is_delivery_movement(new.movement_type, new.quantity) then
      perform public.update_product_last_delivery(new.product_id);
    end if;
  elsif tg_op = 'UPDATE' then
    if public.is_delivery_movement(old.movement_type, old.quantity) then
      perform public.update_product_last_delivery(old.product_id);
    end if;
    if public.is_delivery_movement(new.movement_type, new.quantity) then
      perform public.update_product_last_delivery(new.product_id);
    end if;
  elsif tg_op = 'DELETE' then
    if public.is_delivery_movement(old.movement_type, old.quantity) then
      perform public.update_product_last_delivery(old.product_id);
    end if;
  end if;

  return null;
end;
$$;

create trigger stock_movements_last_delivery_trigger
after insert or update or delete on public.stock_movements
for each row execute function public.handle_stock_movement_last_delivery();

create or replace function public.log_stock_adjustment_from_product_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  skip_flag text := current_setting('seraphine.skip_stock_movement_trigger', true);
begin
  if new.stock is distinct from old.stock then
    if not coalesce(skip_flag, 'false')::boolean then
      insert into public.stock_movements (
        pharmacy_id,
        product_id,
        quantity,
        movement_type,
        reference_id,
        metadata
      )
      values (
        new.pharmacy_id,
        new.id,
        new.stock - old.stock,
        'adjustment',
        new.id,
        jsonb_build_object('source', 'products_manual_update')
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger log_manual_stock_movements
after update on public.products
for each row
when (new.stock is distinct from old.stock)
execute function public.log_stock_adjustment_from_product_update();

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
  effective_created_by uuid := coalesce(p_created_by, public.current_app_user_id());
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
  payment_method payment_type := coalesce(p_payment_type, 'cash');
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

  perform set_config('seraphine.skip_stock_movement_trigger', 'false', true);

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
    effective_created_by,
    payment_method,
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

    perform set_config('seraphine.skip_stock_movement_trigger', 'true', true);
    update public.products
    set stock = product_record.stock - item.quantity
    where id = product_record.id;
    perform set_config('seraphine.skip_stock_movement_trigger', 'false', true);

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
    payment_type = payment_method,
    sale_date = coalesce(p_sale_date, sale_date)
  where id = sale_id;

  if p_client_id is not null and payment_method = 'credit' and sale_total > 0 then
    insert into public.client_balance_events (
      pharmacy_id,
      client_id,
      amount,
      event_type,
      reference_table,
      reference_id,
      metadata
    )
    values (
      p_pharmacy_id,
      p_client_id,
      sale_total,
      'sale_credit',
      'sales',
      sale_id,
      jsonb_build_object('source', 'create_sale_with_items')
    );
  end if;

  perform set_config('seraphine.skip_stock_movement_trigger', 'false', true);

  return sale_id;
end;
$$;

-- Re-sync denormalized balances after introducing the ledger tables.
update public.clients c
set balance = coalesce(
  (
    select sum(amount)
    from public.client_balance_events e
    where e.client_id = c.id
  ),
  0
);

update public.suppliers s
set balance = coalesce(
  (
    select sum(amount)
    from public.supplier_balance_events e
    where e.supplier_id = s.id
  ),
  0
);

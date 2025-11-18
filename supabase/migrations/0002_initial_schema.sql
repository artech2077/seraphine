-- Seraphine – Initial operational schema
-- Adds inventory, CRM, sales, and cash tracking primitives plus utility enums & RPCs.

do $$
begin
  create type payment_type as enum ('cash', 'card', 'credit');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type stock_movement_type as enum ('sale', 'restock', 'adjustment');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  balance numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists suppliers_pharmacy_id_idx on public.suppliers(pharmacy_id);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  credit_limit numeric(12, 2) not null default 0,
  balance numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_pharmacy_id_idx on public.clients(pharmacy_id);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  name text not null,
  sku text,
  barcode text,
  category text,
  cost_price numeric(12, 2) not null default 0,
  sell_price numeric(12, 2) not null default 0,
  stock numeric(12, 2) not null default 0,
  low_stock_threshold numeric(12, 2) not null default 0,
  last_purchase timestamptz,
  last_delivery timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_pharmacy_id_idx on public.products(pharmacy_id);
create index if not exists products_supplier_id_idx on public.products(supplier_id);
create unique index if not exists products_pharmacy_sku_unique on public.products(pharmacy_id, sku) where sku is not null;
create unique index if not exists products_pharmacy_barcode_unique on public.products(pharmacy_id, barcode) where barcode is not null;

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  payment_type payment_type not null default 'cash',
  subtotal numeric(12, 2) not null default 0,
  line_discount_total numeric(12, 2) not null default 0,
  discount_percent numeric(5, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  total_after_discount numeric(12, 2) not null default 0,
  sale_date timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists sales_pharmacy_id_idx on public.sales(pharmacy_id);
create index if not exists sales_client_id_idx on public.sales(client_id);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(12, 2) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  discount_percent numeric(5, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  line_subtotal numeric(12, 2) not null check (line_subtotal >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists sale_items_sale_id_idx on public.sale_items(sale_id);
create index if not exists sale_items_product_id_idx on public.sale_items(product_id);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric(12, 2) not null check (quantity <> 0),
  movement_type stock_movement_type not null,
  reference_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_product_id_idx on public.stock_movements(product_id);
create index if not exists stock_movements_pharmacy_id_idx on public.stock_movements(pharmacy_id);

create table if not exists public.cash_reconciliations (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  date date not null,
  opening_cash numeric(12, 2) not null default 0,
  system_cash_expected numeric(12, 2) not null default 0,
  actual_cash numeric(12, 2) not null default 0,
  discrepancy numeric(12, 2) not null default 0,
  notes text,
  closed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pharmacy_id, date)
);

create index if not exists cash_reconciliations_pharmacy_id_idx on public.cash_reconciliations(pharmacy_id);

-- Utility function to keep timestamps fresh before full trigger automation lands.
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_suppliers_updated_at
before update on public.suppliers
for each row
execute function public.touch_updated_at();

create trigger set_clients_updated_at
before update on public.clients
for each row
execute function public.touch_updated_at();

create trigger set_products_updated_at
before update on public.products
for each row
execute function public.touch_updated_at();

-- RPC: create sale with nested items + stock adjustments
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
    p_created_by,
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

comment on function public.create_sale_with_items is 'Creates a sale, inserts sale items, adjusts product stock, and logs stock movements.';

-- RPC: upsert or insert a cash reconciliation row
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
    p_closed_by
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

comment on function public.record_cash_reconciliation is 'Records or updates the daily cash reconciliation for a pharmacy.';

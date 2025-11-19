-- Seraphine – Dashboard metrics helpers
-- Aggregation functions powering the authenticated dashboard cards.

create or replace function public.get_sales_summary(
  p_pharmacy_id uuid,
  p_timezone text default 'UTC'
)
returns table (
  total numeric,
  transaction_count bigint,
  previous_total numeric,
  last_sale timestamptz
)
language plpgsql
stable
set search_path = public
as $$
declare
  tz text := coalesce(nullif(p_timezone, ''), 'UTC');
  local_now timestamp;
  day_start_utc timestamptz;
  day_end_utc timestamptz;
  prev_start_utc timestamptz;
  prev_end_utc timestamptz;
begin
  if p_pharmacy_id is null then
    return;
  end if;

  local_now := now() at time zone tz;
  day_start_utc := (date_trunc('day', local_now)) at time zone tz;
  day_end_utc := (date_trunc('day', local_now) + interval '1 day') at time zone tz;
  prev_start_utc := day_start_utc - interval '1 day';
  prev_end_utc := day_start_utc;

  return query
  with today as (
    select
      coalesce(sum(total_after_discount), 0) as total,
      count(*) as transaction_count,
      max(sale_date) as last_sale
    from public.sales
    where pharmacy_id = p_pharmacy_id
      and sale_date >= day_start_utc
      and sale_date < day_end_utc
  ),
  previous as (
    select
      coalesce(sum(total_after_discount), 0) as total
    from public.sales
    where pharmacy_id = p_pharmacy_id
      and sale_date >= prev_start_utc
      and sale_date < prev_end_utc
  )
  select
    today.total,
    today.transaction_count,
    previous.total as previous_total,
    today.last_sale
  from today, previous;
end;
$$;


create or replace function public.get_sales_forecast(
  p_pharmacy_id uuid,
  p_timezone text default 'UTC',
  p_window integer default 7
)
returns table (
  moving_average numeric,
  last_day_total numeric,
  window_days integer
)
language plpgsql
stable
set search_path = public
as $$
declare
  tz text := coalesce(nullif(p_timezone, ''), 'UTC');
    window_days integer := greatest(coalesce(p_window, 7), 1);
begin
  if p_pharmacy_id is null then
    return;
  end if;

  return query
  with recent as (
    select
      date_trunc('day', sale_date at time zone tz) as sale_day,
      sum(total_after_discount) as day_total
    from public.sales
    where pharmacy_id = p_pharmacy_id
      and sale_date >= (now() - (window_days || ' days')::interval)
    group by sale_day
  ),
  aggregate as (
    select coalesce(avg(day_total), 0)::numeric as moving_average
    from recent
  ),
  latest as (
    select day_total
    from recent
    order by sale_day desc
    limit 1
  )
    select
      aggregate.moving_average,
      coalesce((select day_total from latest), 0) as last_day_total,
      window_days
  from aggregate;
end;
$$;


create or replace function public.get_stock_alert_snapshot(
  p_pharmacy_id uuid,
  p_limit integer default 6
)
returns table (
  alert_count bigint,
  items jsonb
)
language sql
stable
set search_path = public
as $$
  with low_stock as (
    select
      p.id,
      p.name,
      p.stock,
      p.low_stock_threshold,
      s.name as supplier_name
    from public.products p
    left join public.suppliers s on s.id = p.supplier_id
    where p.pharmacy_id = p_pharmacy_id
      and p.low_stock_threshold > 0
      and p.stock <= p.low_stock_threshold
  ),
  limited as (
    select *
    from low_stock
    order by (stock - low_stock_threshold), name
    limit greatest(coalesce(p_limit, 6), 1)
  )
  select
    (select count(*) from low_stock) as alert_count,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'stock', stock,
            'low_stock_threshold', low_stock_threshold,
            'supplier_name', supplier_name
          )
        )
        from limited
      ),
      '[]'::jsonb
    ) as items;
$$;

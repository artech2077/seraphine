-- Seraphine – Link Clerk accounts to Supabase users
-- Creates the foundational auth tables plus constraints used by the sync worker.

-- Ensure pgcrypto for gen_random_uuid
create extension if not exists "pgcrypto";

create type user_role as enum ('owner', 'staff', 'restricted');

create table if not exists public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text unique not null,
  name text not null,
  address text,
  currency text not null default 'MAD',
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null unique,
  pharmacy_id uuid references public.pharmacies(id) on delete set null,
  role user_role not null default 'restricted',
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.pharmacy_memberships (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role user_role not null,
  created_at timestamptz not null default now(),
  unique (pharmacy_id, user_id)
);

create unique index if not exists pharmacies_clerk_org_id_idx on public.pharmacies(clerk_org_id);
create unique index if not exists users_clerk_id_idx on public.users(clerk_id);
create index if not exists users_pharmacy_id_idx on public.users(pharmacy_id);
create index if not exists pharmacy_memberships_pharmacy_id_idx on public.pharmacy_memberships(pharmacy_id);
create index if not exists pharmacy_memberships_user_id_idx on public.pharmacy_memberships(user_id);

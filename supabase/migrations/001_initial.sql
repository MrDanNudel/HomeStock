-- HomeStock shared-household schema.
-- Apply to a dedicated Supabase project after reviewing the target project.

create extension if not exists pgcrypto;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create type public.inventory_status as enum ('available', 'low', 'missing');

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  status public.inventory_status not null default 'available',
  quantity numeric check (quantity >= 0),
  unit text check (unit is null or char_length(unit) <= 30),
  note text check (note is null or char_length(note) <= 300),
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index inventory_items_household_idx on public.inventory_items(household_id);
create index inventory_items_category_idx on public.inventory_items(category_id);
create index inventory_items_status_idx on public.inventory_items(household_id, status);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.inventory_items enable row level security;

create schema if not exists private;

create or replace function private.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.household_members hm
      where hm.household_id = target_household_id
        and hm.user_id = (select auth.uid())
    );
$$;

revoke all on function private.is_household_member(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_household_member(uuid) to authenticated;

create policy "members can view households" on public.households for select to authenticated
using ((select private.is_household_member(id)));

create policy "members can view memberships" on public.household_members for select to authenticated
using ((select private.is_household_member(household_id)));

create policy "members can view categories" on public.categories for select to authenticated
using ((select private.is_household_member(household_id)));
create policy "members can create categories" on public.categories for insert to authenticated
with check ((select private.is_household_member(household_id)));
create policy "members can update categories" on public.categories for update to authenticated
using ((select private.is_household_member(household_id)))
with check ((select private.is_household_member(household_id)));
create policy "members can delete categories" on public.categories for delete to authenticated
using ((select private.is_household_member(household_id)));

create policy "members can view items" on public.inventory_items for select to authenticated
using ((select private.is_household_member(household_id)));
create policy "members can create items" on public.inventory_items for insert to authenticated
with check (updated_by = (select auth.uid()) and (select private.is_household_member(household_id)));
create policy "members can update items" on public.inventory_items for update to authenticated
using ((select private.is_household_member(household_id)))
with check (updated_by = (select auth.uid()) and (select private.is_household_member(household_id)));
create policy "members can delete items" on public.inventory_items for delete to authenticated
using ((select private.is_household_member(household_id)));

grant select, insert, update, delete on public.households, public.household_members, public.categories, public.inventory_items to authenticated;

alter publication supabase_realtime add table public.inventory_items;

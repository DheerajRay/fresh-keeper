-- FreshKeeper Supabase bootstrap schema
-- Apply this in the Supabase SQL editor before moving synced app data off localStorage.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (household_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;

create or replace function public.current_household_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select household_id
  from public.household_members
  where user_id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household_id uuid;
  derived_name text;
begin
  derived_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'FreshKeeper user');

  insert into public.profiles (user_id, email, display_name)
  values (new.id, new.email, derived_name)
  on conflict (user_id) do nothing;

  insert into public.households (name, owner_user_id)
  values (derived_name || '''s household', new.id)
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, new.id, 'owner')
  on conflict (household_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create policy "users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = user_id);

create policy "users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "members can read households"
  on public.households
  for select
  using (id in (select public.current_household_ids()));

create policy "owners can update households"
  on public.households
  for update
  using (
    exists (
      select 1
      from public.household_members hm
      where hm.household_id = households.id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  )
  with check (
    exists (
      select 1
      from public.household_members hm
      where hm.household_id = households.id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

create policy "members can read membership"
  on public.household_members
  for select
  using (household_id in (select public.current_household_ids()));

create policy "owners can insert members"
  on public.household_members
  for insert
  with check (
    exists (
      select 1
      from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

create or replace function public.touch_profile_last_seen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set last_seen_at = timezone('utc', now())
  where user_id = auth.uid();

  return new;
end;
$$;

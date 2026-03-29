create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.inventory_items (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  zone_id text not null,
  added_at timestamptz not null,
  expiry_at timestamptz not null,
  estimated_days integer not null default 0,
  note text,
  quantity integer not null default 1,
  unit text,
  recommended_storage text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.consumption_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  item_id text,
  name text not null,
  zone_id text not null,
  added_at timestamptz,
  expiry_at timestamptz,
  estimated_days integer,
  note text,
  quantity integer not null default 1,
  unit text,
  recommended_storage text,
  consumed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.shops (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists shops_household_name_idx on public.shops (household_id, lower(name));

create table if not exists public.shopping_items (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  quantity integer not null default 1,
  unit text,
  category text not null check (category in ('Restock', 'Expiring Soon', 'AI Suggestion', 'User Added')),
  reason text,
  is_checked boolean not null default false,
  shop_id text references public.shops(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.meal_plan_buckets (
  household_id uuid not null references public.households(id) on delete cascade,
  bucket_key text not null,
  meals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (household_id, bucket_key)
);

create table if not exists public.meal_suggestion_queues (
  household_id uuid primary key references public.households(id) on delete cascade,
  meals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dietary_restrictions text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  model text,
  success boolean not null default true,
  context jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.inventory_items enable row level security;
alter table public.consumption_events enable row level security;
alter table public.shops enable row level security;
alter table public.shopping_items enable row level security;
alter table public.meal_plan_buckets enable row level security;
alter table public.meal_suggestion_queues enable row level security;
alter table public.user_preferences enable row level security;
alter table public.activity_events enable row level security;
alter table public.ai_events enable row level security;

drop trigger if exists inventory_items_set_updated_at on public.inventory_items;
create trigger inventory_items_set_updated_at
  before update on public.inventory_items
  for each row execute procedure public.set_updated_at();

drop trigger if exists shops_set_updated_at on public.shops;
create trigger shops_set_updated_at
  before update on public.shops
  for each row execute procedure public.set_updated_at();

drop trigger if exists shopping_items_set_updated_at on public.shopping_items;
create trigger shopping_items_set_updated_at
  before update on public.shopping_items
  for each row execute procedure public.set_updated_at();

drop trigger if exists meal_plan_buckets_set_updated_at on public.meal_plan_buckets;
create trigger meal_plan_buckets_set_updated_at
  before update on public.meal_plan_buckets
  for each row execute procedure public.set_updated_at();

drop trigger if exists meal_suggestion_queues_set_updated_at on public.meal_suggestion_queues;
create trigger meal_suggestion_queues_set_updated_at
  before update on public.meal_suggestion_queues
  for each row execute procedure public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute procedure public.set_updated_at();

create policy "members can read inventory"
  on public.inventory_items
  for select
  using (household_id in (select public.current_household_ids()));

create policy "members can mutate inventory"
  on public.inventory_items
  for all
  using (household_id in (select public.current_household_ids()))
  with check (household_id in (select public.current_household_ids()));

create policy "members can read consumption history"
  on public.consumption_events
  for select
  using (household_id in (select public.current_household_ids()));

create policy "members can insert consumption history"
  on public.consumption_events
  for insert
  with check (household_id in (select public.current_household_ids()));

create policy "members can read shops"
  on public.shops
  for select
  using (household_id in (select public.current_household_ids()));

create policy "members can mutate shops"
  on public.shops
  for all
  using (household_id in (select public.current_household_ids()))
  with check (household_id in (select public.current_household_ids()));

create policy "members can read shopping items"
  on public.shopping_items
  for select
  using (household_id in (select public.current_household_ids()));

create policy "members can mutate shopping items"
  on public.shopping_items
  for all
  using (household_id in (select public.current_household_ids()))
  with check (household_id in (select public.current_household_ids()));

create policy "members can read meal plan buckets"
  on public.meal_plan_buckets
  for select
  using (household_id in (select public.current_household_ids()));

create policy "members can mutate meal plan buckets"
  on public.meal_plan_buckets
  for all
  using (household_id in (select public.current_household_ids()))
  with check (household_id in (select public.current_household_ids()));

create policy "members can read meal suggestion queues"
  on public.meal_suggestion_queues
  for select
  using (household_id in (select public.current_household_ids()));

create policy "members can mutate meal suggestion queues"
  on public.meal_suggestion_queues
  for all
  using (household_id in (select public.current_household_ids()))
  with check (household_id in (select public.current_household_ids()));

create policy "users can read own preferences"
  on public.user_preferences
  for select
  using (user_id = auth.uid());

create policy "users can mutate own preferences"
  on public.user_preferences
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "members can read activity events"
  on public.activity_events
  for select
  using (household_id in (select public.current_household_ids()));

create policy "members can insert activity events"
  on public.activity_events
  for insert
  with check (
    household_id in (select public.current_household_ids())
    and user_id = auth.uid()
  );

create policy "members can read ai events"
  on public.ai_events
  for select
  using (household_id in (select public.current_household_ids()));

create policy "members can insert ai events"
  on public.ai_events
  for insert
  with check (
    household_id in (select public.current_household_ids())
    and user_id = auth.uid()
  );

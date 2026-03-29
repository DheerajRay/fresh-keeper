alter table public.user_preferences
  add column if not exists theme text not null default 'dark';

alter table public.shops
  add column if not exists store_type text not null default 'grocery';

alter table public.shops
  add column if not exists is_default boolean not null default false;

alter table public.shopping_items
  add column if not exists source text not null default 'manual';

alter table public.shopping_items
  add column if not exists store_type text;

update public.shops
set store_type = case
  when lower(name) like '%amazon%' or lower(name) like '%specialty%' or lower(name) like '%asian%' or lower(name) like '%indian%' or lower(name) like '%japanese%' then 'amazon_specialty'
  when lower(name) like '%costco%' or lower(name) like '%target%' or lower(name) like '%walmart%' or lower(name) like '%bulk%' or lower(name) like '%mall%' then 'mall'
  else 'grocery'
end
where store_type is null or store_type = 'grocery';

update public.shopping_items
set source = case
  when category = 'AI Suggestion' then 'discover_recipe'
  when category = 'Restock' then 'restock'
  else 'manual'
end
where source is null or source = 'manual';

alter table public.user_preferences
  add column if not exists app_size text not null default 'm';

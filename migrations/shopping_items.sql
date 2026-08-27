-- Shared shopping list — an always-open list of things the couple needs to buy.
-- Either partner adds; either partner ticks off. Ticked items move to a "Bought"
-- section and can be restocked (is_bought back to false) rather than retyped.

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  added_by_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_bought boolean not null default false,
  bought_at timestamptz,
  bought_by_user_id uuid references auth.users(id) on delete set null,
  -- Sort key for the open list. Set to now() on insert AND on restock, so a
  -- restocked item returns to the top instead of sinking to its original
  -- created_at position.
  sort_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists shopping_items_open_idx
  on public.shopping_items (couple_id, is_bought, sort_at desc);
create index if not exists shopping_items_bought_idx
  on public.shopping_items (couple_id, is_bought, bought_at desc);

alter table public.shopping_items enable row level security;

-- A shopping list is fully shared: either partner may read, add, tick off,
-- restock, or delete anything on it. All four policies scope to the couple via
-- the SECURITY DEFINER helper (avoids RLS recursion on public.users).
drop policy if exists "shopping_items_select_couple" on public.shopping_items;
create policy "shopping_items_select_couple"
  on public.shopping_items for select
  using (couple_id = public.get_my_couple_id());

drop policy if exists "shopping_items_insert_couple" on public.shopping_items;
create policy "shopping_items_insert_couple"
  on public.shopping_items for insert
  with check (couple_id = public.get_my_couple_id());

drop policy if exists "shopping_items_update_couple" on public.shopping_items;
create policy "shopping_items_update_couple"
  on public.shopping_items for update
  using (couple_id = public.get_my_couple_id())
  with check (couple_id = public.get_my_couple_id());

drop policy if exists "shopping_items_delete_couple" on public.shopping_items;
create policy "shopping_items_delete_couple"
  on public.shopping_items for delete
  using (couple_id = public.get_my_couple_id());

-- Required for the client-side realtime subscription to fire at all.
-- Verify afterwards in Dashboard > Database > Replication that the table is listed.
alter publication supabase_realtime add table public.shopping_items;

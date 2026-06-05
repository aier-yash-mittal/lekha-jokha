-- =============================================================================
-- Lekha-Jokha — initial schema, triggers and Row Level Security
-- Run this in the Supabase SQL editor (or via the Supabase CLI) on your project.
-- Users are managed by you in Supabase Auth; a matching row in public.profiles
-- is created automatically by a trigger whenever an auth user is created.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. PROFILES  (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  upi_id      text,
  created_at  timestamptz not null default now()
);

-- Keep a public profile in sync with auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users that already exist in auth.users.
insert into public.profiles (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. GROUPS
-- -----------------------------------------------------------------------------
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  emoji       text default '🧾',
  created_by  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3. GROUP MEMBERS
-- -----------------------------------------------------------------------------
create table if not exists public.group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  unique (group_id, user_id)
);
create index if not exists idx_group_members_group on public.group_members (group_id);
create index if not exists idx_group_members_user  on public.group_members (user_id);

-- -----------------------------------------------------------------------------
-- 4. EXPENSES
-- -----------------------------------------------------------------------------
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  description  text not null,
  amount       numeric(12,2) not null check (amount > 0),
  currency     text not null default 'USD',
  category     text default 'general',
  paid_by      uuid not null references public.profiles (id),
  split_type   text not null default 'equal' check (split_type in ('equal','exact','percentage')),
  expense_date date not null default current_date,
  created_by   uuid not null references public.profiles (id),
  created_at   timestamptz not null default now()
);
create index if not exists idx_expenses_group on public.expenses (group_id);

-- -----------------------------------------------------------------------------
-- 5. EXPENSE SPLITS  (how much each participant owes for an expense)
-- -----------------------------------------------------------------------------
create table if not exists public.expense_splits (
  id          uuid primary key default gen_random_uuid(),
  expense_id  uuid not null references public.expenses (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  amount      numeric(12,2) not null,
  unique (expense_id, user_id)
);
create index if not exists idx_expense_splits_expense on public.expense_splits (expense_id);

-- -----------------------------------------------------------------------------
-- 6. SETTLEMENTS  (a payment recorded from one member to another)
-- -----------------------------------------------------------------------------
create table if not exists public.settlements (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  from_user  uuid not null references public.profiles (id),
  to_user    uuid not null references public.profiles (id),
  amount     numeric(12,2) not null check (amount > 0),
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists idx_settlements_group on public.settlements (group_id);

-- =============================================================================
-- HELPER FUNCTIONS  (SECURITY DEFINER -> run as owner, bypass RLS so that
-- membership checks inside policies don't recurse on group_members.)
-- =============================================================================
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = gid and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_creator(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.groups g
    where g.id = gid and g.created_by = auth.uid()
  );
$$;

create or replace function public.can_access_expense(eid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_group_member((select group_id from public.expenses where id = eid));
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.profiles       enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.expenses       enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements    enable row level security;

-- ---- PROFILES ---------------------------------------------------------------
-- Any authenticated user can read profiles (needed to look people up / show names).
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---- GROUPS -----------------------------------------------------------------
drop policy if exists "groups_select" on public.groups;
create policy "groups_select" on public.groups
  for select to authenticated
  using (created_by = auth.uid() or public.is_group_member(id));

drop policy if exists "groups_insert" on public.groups;
create policy "groups_insert" on public.groups
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "groups_update" on public.groups;
create policy "groups_update" on public.groups
  for update to authenticated
  using (created_by = auth.uid() or public.is_group_member(id))
  with check (created_by = auth.uid() or public.is_group_member(id));

drop policy if exists "groups_delete" on public.groups;
create policy "groups_delete" on public.groups
  for delete to authenticated using (created_by = auth.uid());

-- ---- GROUP MEMBERS ----------------------------------------------------------
drop policy if exists "members_select" on public.group_members;
create policy "members_select" on public.group_members
  for select to authenticated
  using (public.is_group_member(group_id) or public.is_group_creator(group_id));

drop policy if exists "members_insert" on public.group_members;
create policy "members_insert" on public.group_members
  for insert to authenticated
  with check (public.is_group_creator(group_id) or public.is_group_member(group_id));

drop policy if exists "members_delete" on public.group_members;
create policy "members_delete" on public.group_members
  for delete to authenticated
  using (public.is_group_creator(group_id) or user_id = auth.uid());

-- ---- EXPENSES ---------------------------------------------------------------
drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert" on public.expenses
  for insert to authenticated
  with check (public.is_group_member(group_id) and created_by = auth.uid());

drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update" on public.expenses
  for update to authenticated
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_delete" on public.expenses
  for delete to authenticated using (public.is_group_member(group_id));

-- ---- EXPENSE SPLITS ---------------------------------------------------------
drop policy if exists "splits_select" on public.expense_splits;
create policy "splits_select" on public.expense_splits
  for select to authenticated using (public.can_access_expense(expense_id));

drop policy if exists "splits_insert" on public.expense_splits;
create policy "splits_insert" on public.expense_splits
  for insert to authenticated with check (public.can_access_expense(expense_id));

drop policy if exists "splits_update" on public.expense_splits;
create policy "splits_update" on public.expense_splits
  for update to authenticated
  using (public.can_access_expense(expense_id))
  with check (public.can_access_expense(expense_id));

drop policy if exists "splits_delete" on public.expense_splits;
create policy "splits_delete" on public.expense_splits
  for delete to authenticated using (public.can_access_expense(expense_id));

-- ---- SETTLEMENTS ------------------------------------------------------------
drop policy if exists "settlements_select" on public.settlements;
create policy "settlements_select" on public.settlements
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "settlements_insert" on public.settlements;
create policy "settlements_insert" on public.settlements
  for insert to authenticated
  with check (public.is_group_member(group_id) and from_user = auth.uid());

drop policy if exists "settlements_delete" on public.settlements;
create policy "settlements_delete" on public.settlements
  for delete to authenticated using (public.is_group_member(group_id));

-- =============================================================================
-- Done.
-- =============================================================================

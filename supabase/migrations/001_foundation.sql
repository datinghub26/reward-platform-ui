-- RewardNova — Phase 03.1 Foundation
-- PostgreSQL / Supabase
-- Withdrawals intentionally excluded for now.

create extension if not exists pgcrypto;

-- =========================================================
-- ENUMS
-- =========================================================

do $$ begin
  create type public.account_status as enum (
    'active',
    'restricted',
    'suspended'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.offer_status as enum (
    'draft',
    'active',
    'paused',
    'archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.click_status as enum (
    'started',
    'redirected',
    'completed',
    'expired',
    'blocked'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.conversion_status as enum (
    'pending',
    'approved',
    'rejected',
    'reversed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ledger_entry_type as enum (
    'credit',
    'debit',
    'reversal',
    'adjustment'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.support_status as enum (
    'open',
    'in_progress',
    'resolved',
    'closed'
  );
exception when duplicate_object then null;
end $$;

-- =========================================================
-- USER PROFILE
-- Auth credentials live in auth.users.
-- This table stores application-level account information.
-- =========================================================

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  country_code text,
  timezone text default 'UTC',
  status public.account_status not null default 'active',
  available_points bigint not null default 0 check (available_points >= 0),
  pending_points bigint not null default 0 check (pending_points >= 0),
  lifetime_points bigint not null default 0 check (lifetime_points >= 0),
  leaderboard_points bigint not null default 0 check (leaderboard_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_status
  on public.user_profiles(status);

create index if not exists idx_user_profiles_leaderboard
  on public.user_profiles(leaderboard_points desc);

-- =========================================================
-- OFFERS
-- One unified offer wall: CPA, surveys, games, apps, signups.
-- =========================================================

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  external_offer_id text,
  provider_name text not null,
  title text not null,
  description text,
  category text not null,
  offer_type text not null,
  status public.offer_status not null default 'draft',
  reward_points bigint not null check (reward_points > 0),
  reward_currency numeric(12,2),
  countries text[] not null default '{}',
  devices text[] not null default '{}',
  tracking_url text,
  terms text,
  featured boolean not null default false,
  popular boolean not null default false,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_name, external_offer_id)
);

create index if not exists idx_offers_status
  on public.offers(status);

create index if not exists idx_offers_category
  on public.offers(category);

create index if not exists idx_offers_featured_priority
  on public.offers(featured desc, priority desc);

-- =========================================================
-- OFFER CLICKS
-- Immutable-ish tracking record for each user's offer start.
-- =========================================================

create table if not exists public.offer_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete restrict,
  click_id text not null unique,
  status public.click_status not null default 'started',
  source text,
  sub_id text,
  country_code text,
  device_type text,
  ip_hash text,
  user_agent text,
  clicked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_offer_clicks_user
  on public.offer_clicks(user_id, clicked_at desc);

create index if not exists idx_offer_clicks_offer
  on public.offer_clicks(offer_id, clicked_at desc);

create index if not exists idx_offer_clicks_click_id
  on public.offer_clicks(click_id);

-- =========================================================
-- CONVERSIONS
-- Provider/postback events live here.
-- Users should not be able to insert/update these directly.
-- =========================================================

create table if not exists public.conversions (
  id uuid primary key default gen_random_uuid(),
  click_id uuid references public.offer_clicks(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete restrict,
  provider_name text not null,
  external_conversion_id text,
  status public.conversion_status not null default 'pending',
  reward_points bigint not null check (reward_points >= 0),
  payout_amount numeric(12,4),
  currency text default 'USD',
  raw_payload jsonb not null default '{}'::jsonb,
  converted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_name, external_conversion_id)
);

create index if not exists idx_conversions_user
  on public.conversions(user_id, created_at desc);

create index if not exists idx_conversions_status
  on public.conversions(status, created_at desc);

create index if not exists idx_conversions_click
  on public.conversions(click_id);

-- =========================================================
-- REWARD LEDGER
-- Source of truth for point movements.
-- Balance columns in user_profiles are cached aggregates.
-- =========================================================

create table if not exists public.reward_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversion_id uuid references public.conversions(id) on delete set null,
  entry_type public.ledger_entry_type not null,
  points bigint not null check (points <> 0),
  balance_after bigint,
  reason text not null,
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_reward_ledger_user
  on public.reward_ledger(user_id, created_at desc);

create index if not exists idx_reward_ledger_conversion
  on public.reward_ledger(conversion_id);

-- =========================================================
-- ACTIVITY LOG
-- User-facing activity/history feed.
-- =========================================================

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  points_delta bigint,
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_log_user
  on public.activity_log(user_id, created_at desc);

-- =========================================================
-- SUPPORT TICKETS
-- =========================================================

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  message text not null,
  status public.support_status not null default 'open',
  priority text not null default 'normal',
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_user
  on public.support_tickets(user_id, created_at desc);

create index if not exists idx_support_tickets_status
  on public.support_tickets(status, created_at desc);

-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_offers_updated_at on public.offers;
create trigger trg_offers_updated_at
before update on public.offers
for each row execute function public.set_updated_at();

drop trigger if exists trg_offer_clicks_updated_at on public.offer_clicks;
create trigger trg_offer_clicks_updated_at
before update on public.offer_clicks
for each row execute function public.set_updated_at();

drop trigger if exists trg_conversions_updated_at on public.conversions;
create trigger trg_conversions_updated_at
before update on public.conversions
for each row execute function public.set_updated_at();

drop trigger if exists trg_support_tickets_updated_at on public.support_tickets;
create trigger trg_support_tickets_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

-- =========================================================
-- AUTO-CREATE APPLICATION PROFILE AFTER AUTH SIGNUP
-- No email verification is required by our product flow.
-- Supabase Auth remains responsible for password storage/session auth.
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.user_profiles enable row level security;
alter table public.offers enable row level security;
alter table public.offer_clicks enable row level security;
alter table public.conversions enable row level security;
alter table public.reward_ledger enable row level security;
alter table public.activity_log enable row level security;
alter table public.support_tickets enable row level security;

-- User profile: owner can read/update their own profile.
drop policy if exists "users_read_own_profile" on public.user_profiles;
create policy "users_read_own_profile"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "users_update_own_profile" on public.user_profiles;
create policy "users_update_own_profile"
on public.user_profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Offers: active offers are public to authenticated users.
drop policy if exists "authenticated_read_active_offers" on public.offers;
create policy "authenticated_read_active_offers"
on public.offers
for select
to authenticated
using (status = 'active');

-- Offer clicks: users can create/read their own clicks.
drop policy if exists "users_read_own_clicks" on public.offer_clicks;
create policy "users_read_own_clicks"
on public.offer_clicks
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users_create_own_clicks" on public.offer_clicks;
create policy "users_create_own_clicks"
on public.offer_clicks
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- Conversions: users can only see their own conversion history.
drop policy if exists "users_read_own_conversions" on public.conversions;
create policy "users_read_own_conversions"
on public.conversions
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Reward ledger: users can read their own ledger.
-- Inserts/updates are intentionally NOT granted to normal users.
drop policy if exists "users_read_own_ledger" on public.reward_ledger;
create policy "users_read_own_ledger"
on public.reward_ledger
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Activity: users can read their own activity.
drop policy if exists "users_read_own_activity" on public.activity_log;
create policy "users_read_own_activity"
on public.activity_log
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Support: users can create/read/update their own tickets.
drop policy if exists "users_read_own_tickets" on public.support_tickets;
create policy "users_read_own_tickets"
on public.support_tickets
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users_create_own_tickets" on public.support_tickets;
create policy "users_create_own_tickets"
on public.support_tickets
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users_update_own_tickets" on public.support_tickets;
create policy "users_update_own_tickets"
on public.support_tickets
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- =========================================================
-- NOTE:
-- Admin/service operations are intentionally not exposed to
-- normal authenticated users. Use a server-side service role
-- or dedicated admin policies/functions later.
-- =========================================================

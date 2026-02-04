-- Credits-based Monetization System (Ledger + Growth Loops)
-- Created 2026-02-04
--
-- Goals:
-- - Server-authoritative credits: grant / spend via SECURITY DEFINER RPCs
-- - Auditability: lot-based ledger + consumption mapping
-- - Growth loops: referrals + daily streak rewards
-- - Safety: rate-limiting primitives for credit-consuming endpoints
-- - Backwards compatible: keep `public.credits.balance` as the primary read model
a
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1) Credits read model (backwards compatible)
-- ============================================================================

alter table public.credits
  add column if not exists paid_balance integer not null default 0,
  add column if not exists bonus_balance integer not null default 0,
  add column if not exists allowance_balance integer not null default 0,
  add column if not exists expiring_soon_balance integer not null default 0,
  add column if not exists next_expiration_at timestamptz;

comment on column public.credits.balance is 'Available credits (sum of unexpired remaining lots)';
comment on column public.credits.paid_balance is 'Paid credits remaining (non-expiring by default)';
comment on column public.credits.bonus_balance is 'Bonus/earned credits remaining (typically expiring)';
comment on column public.credits.allowance_balance is 'Subscription/free allowance credits remaining (typically expiring)';
comment on column public.credits.expiring_soon_balance is 'Credits expiring within the next 7 days';
comment on column public.credits.next_expiration_at is 'Next soonest lot expiration timestamp (if any)';

-- ============================================================================
-- 2) Credits ledger (lots + spends)
-- ============================================================================

do $$ begin
  create type public.credit_bucket as enum ('paid', 'bonus', 'allowance');
exception when duplicate_object then null;
end $$;

create table if not exists public.credit_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bucket public.credit_bucket not null,
  source text not null,
  amount integer not null check (amount > 0),
  remaining integer not null check (remaining >= 0),
  expires_at timestamptz,
  idempotency_key text,
  provider text,
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_lots_user on public.credit_lots(user_id);
create index if not exists idx_credit_lots_user_expires on public.credit_lots(user_id, expires_at);
create index if not exists idx_credit_lots_user_bucket on public.credit_lots(user_id, bucket);

create unique index if not exists uniq_credit_lots_user_idempotency
  on public.credit_lots(user_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.credit_spends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  feature text not null,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_spends_user on public.credit_spends(user_id);
create index if not exists idx_credit_spends_feature on public.credit_spends(feature);
create index if not exists idx_credit_spends_created on public.credit_spends(created_at desc);
create unique index if not exists uniq_credit_spends_user_idempotency
  on public.credit_spends(user_id, idempotency_key);

create table if not exists public.credit_spend_consumptions (
  id uuid primary key default gen_random_uuid(),
  spend_id uuid not null references public.credit_spends(id) on delete cascade,
  lot_id uuid not null references public.credit_lots(id) on delete cascade,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (spend_id, lot_id)
);

create index if not exists idx_credit_consumptions_spend on public.credit_spend_consumptions(spend_id);
create index if not exists idx_credit_consumptions_lot on public.credit_spend_consumptions(lot_id);

-- RLS (users can read their own ledger; writes are service-role/RPC only)
alter table public.credit_lots enable row level security;
alter table public.credit_spends enable row level security;
alter table public.credit_spend_consumptions enable row level security;

create policy "Users can view own credit lots"
  on public.credit_lots for select
  using (auth.uid() = user_id);

create policy "Users can view own credit spends"
  on public.credit_spends for select
  using (auth.uid() = user_id);

create policy "Users can view own credit consumptions"
  on public.credit_spend_consumptions for select
  using (exists (
    select 1 from public.credit_spends s
    where s.id = credit_spend_consumptions.spend_id
      and s.user_id = auth.uid()
  ));

-- ============================================================================
-- 3) Credits core RPCs
-- ============================================================================

create or replace function public.refresh_credits_balance(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  insert into public.credits (
    user_id,
    balance,
    paid_balance,
    bonus_balance,
    allowance_balance,
    expiring_soon_balance,
    next_expiration_at,
    updated_at
  )
  select
    p_user_id,
    coalesce(sum(remaining) filter (where expires_at is null or expires_at > v_now), 0)::integer as balance,
    coalesce(sum(remaining) filter (where bucket = 'paid' and (expires_at is null or expires_at > v_now)), 0)::integer as paid_balance,
    coalesce(sum(remaining) filter (where bucket = 'bonus' and (expires_at is null or expires_at > v_now)), 0)::integer as bonus_balance,
    coalesce(sum(remaining) filter (where bucket = 'allowance' and (expires_at is null or expires_at > v_now)), 0)::integer as allowance_balance,
    coalesce(sum(remaining) filter (
      where expires_at is not null
        and expires_at > v_now
        and expires_at <= v_now + interval '7 days'
    ), 0)::integer as expiring_soon_balance,
    min(expires_at) filter (where remaining > 0 and expires_at is not null and expires_at > v_now) as next_expiration_at,
    now()
  from public.credit_lots
  where user_id = p_user_id
  on conflict (user_id) do update set
    balance = excluded.balance,
    paid_balance = excluded.paid_balance,
    bonus_balance = excluded.bonus_balance,
    allowance_balance = excluded.allowance_balance,
    expiring_soon_balance = excluded.expiring_soon_balance,
    next_expiration_at = excluded.next_expiration_at,
    updated_at = now();
end;
$$;

comment on function public.refresh_credits_balance is 'Recomputes credit balances for a user from unexpired remaining lots';

create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_bucket public.credit_bucket,
  p_source text,
  p_expires_at timestamptz default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_provider text default null,
  p_provider_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_credit_amount';
  end if;

  if p_idempotency_key is not null then
    select id into v_lot_id
    from public.credit_lots
    where user_id = p_user_id and idempotency_key = p_idempotency_key
    limit 1;

    if found then
      return v_lot_id;
    end if;
  end if;

  insert into public.credit_lots (
    user_id,
    bucket,
    source,
    amount,
    remaining,
    expires_at,
    idempotency_key,
    provider,
    provider_reference,
    metadata
  )
  values (
    p_user_id,
    p_bucket,
    p_source,
    p_amount,
    p_amount,
    p_expires_at,
    p_idempotency_key,
    p_provider,
    p_provider_reference,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_lot_id;

  perform public.refresh_credits_balance(p_user_id);

  return v_lot_id;
end;
$$;

comment on function public.grant_credits is 'Creates a new credit lot (idempotent per user+idempotency_key) and refreshes summary balances';

create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_idempotency_key text,
  p_feature text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_spend_id uuid;
  v_needed integer := p_amount;
  v_available integer;
  v_take integer;
  v_lot record;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_credit_amount';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 6 then
    raise exception 'invalid_idempotency_key';
  end if;

  select id into v_spend_id
  from public.credit_spends
  where user_id = p_user_id and idempotency_key = p_idempotency_key
  limit 1;

  if found then
    return v_spend_id;
  end if;

  select coalesce(sum(remaining), 0)::integer into v_available
  from public.credit_lots
  where user_id = p_user_id
    and remaining > 0
    and (expires_at is null or expires_at > v_now);

  if v_available < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  insert into public.credit_spends (user_id, amount, feature, idempotency_key, metadata)
  values (p_user_id, p_amount, p_feature, p_idempotency_key, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_spend_id;

  -- Consume expiring credits first, then oldest grants.
  for v_lot in
    select id, remaining
    from public.credit_lots
    where user_id = p_user_id
      and remaining > 0
      and (expires_at is null or expires_at > v_now)
    order by
      (expires_at is null) asc,
      expires_at asc nulls last,
      created_at asc
    for update
  loop
    exit when v_needed <= 0;
    v_take := least(v_lot.remaining::integer, v_needed);

    update public.credit_lots
      set remaining = remaining - v_take
      where id = v_lot.id;

    insert into public.credit_spend_consumptions (spend_id, lot_id, amount)
      values (v_spend_id, v_lot.id, v_take);

    v_needed := v_needed - v_take;
  end loop;

  perform public.refresh_credits_balance(p_user_id);

  return v_spend_id;
end;
$$;

comment on function public.spend_credits is 'Atomically spends credits using lot FIFO with idempotency and updates summary balances';

-- ============================================================================
-- 4) Referrals (invite loop)
-- ============================================================================

create table if not exists public.referral_codes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_redemptions (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.profiles(id) on delete cascade,
  referee_user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null references public.referral_codes(code) on delete restrict,
  created_at timestamptz not null default now(),
  conversion_rewarded_at timestamptz
);

create unique index if not exists uniq_referral_referee on public.referral_redemptions(referee_user_id);
create index if not exists idx_referral_referrer on public.referral_redemptions(referrer_user_id);

alter table public.referral_codes enable row level security;
alter table public.referral_redemptions enable row level security;

create policy "Users can view own referral code"
  on public.referral_codes for select
  using (auth.uid() = user_id);

create policy "Users can view own referral redemptions"
  on public.referral_redemptions for select
  using (auth.uid() = referrer_user_id or auth.uid() = referee_user_id);

create or replace function public.generate_referral_code()
returns text
language sql
security definer
set search_path = public
as $$
  select upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));
$$;

create or replace function public.get_or_create_referral_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  select code into v_code from public.referral_codes where user_id = p_user_id;
  if found then return v_code; end if;

  loop
    v_code := public.generate_referral_code();
    begin
      insert into public.referral_codes (user_id, code) values (p_user_id, v_code);
      exit;
    exception when unique_violation then
      -- retry on collision
    end;
  end loop;

  return v_code;
end;
$$;

comment on function public.get_or_create_referral_code is 'Creates a unique referral code for a user if missing';

create or replace function public.redeem_referral(p_referee_user_id uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_user_id uuid;
begin
  if p_code is null or length(trim(p_code)) < 4 then
    raise exception 'invalid_referral_code';
  end if;

  select user_id into v_referrer_user_id
  from public.referral_codes
  where code = p_code
  limit 1;

  if v_referrer_user_id is null then
    raise exception 'invalid_referral_code';
  end if;

  if v_referrer_user_id = p_referee_user_id then
    raise exception 'self_referral_not_allowed';
  end if;

  -- One referral per referee.
  insert into public.referral_redemptions (referrer_user_id, referee_user_id, code)
  values (v_referrer_user_id, p_referee_user_id, p_code)
  on conflict (referee_user_id) do nothing;

  -- Signup bonus (expiring bonus credits for urgency).
  perform public.grant_credits(
    p_referee_user_id,
    75,
    'bonus',
    'referral_signup',
    now() + interval '30 days',
    'referral:signup:' || p_referee_user_id::text,
    jsonb_build_object('referrer_user_id', v_referrer_user_id::text),
    null,
    null
  );

  perform public.grant_credits(
    v_referrer_user_id,
    75,
    'bonus',
    'referral_signup',
    now() + interval '30 days',
    'referral:signup:' || p_referee_user_id::text,
    jsonb_build_object('referee_user_id', p_referee_user_id::text),
    null,
    null
  );
end;
$$;

comment on function public.redeem_referral is 'Awards referral signup bonuses to both referrer and referee (idempotent per referee)';

create or replace function public.award_referral_conversion(p_referee_user_id uuid, p_provider_reference text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_redemption record;
begin
  select *
    into v_redemption
  from public.referral_redemptions
  where referee_user_id = p_referee_user_id
  limit 1;

  if not found then
    return;
  end if;

  if v_redemption.conversion_rewarded_at is not null then
    return;
  end if;

  -- Conversion reward goes to referrer (higher intent).
  perform public.grant_credits(
    v_redemption.referrer_user_id,
    150,
    'bonus',
    'referral_conversion',
    now() + interval '60 days',
    'referral:conversion:' || p_referee_user_id::text,
    jsonb_build_object('referee_user_id', p_referee_user_id::text, 'provider_reference', p_provider_reference),
    'stripe',
    p_provider_reference
  );

  update public.referral_redemptions
    set conversion_rewarded_at = now()
    where id = v_redemption.id;
end;
$$;

comment on function public.award_referral_conversion is 'One-time conversion reward to the referrer when referee makes a purchase';

-- ============================================================================
-- 5) Daily check-in + streak rewards (return loop)
-- ============================================================================

create table if not exists public.user_streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_claim_date date,
  updated_at timestamptz not null default now()
);

alter table public.user_streaks enable row level security;

create policy "Users can view own streak"
  on public.user_streaks for select
  using (auth.uid() = user_id);

create or replace function public.claim_daily_credits(p_user_id uuid)
returns table(granted integer, streak integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_last date;
  v_streak integer;
  v_longest integer;
  v_base integer := 5;
  v_bonus integer := 0;
  v_total integer;
begin
  -- Lock streak row for update.
  insert into public.user_streaks (user_id, current_streak, longest_streak, last_claim_date)
  values (p_user_id, 0, 0, null)
  on conflict (user_id) do nothing;

  select last_claim_date, current_streak, longest_streak
    into v_last, v_streak, v_longest
  from public.user_streaks
  where user_id = p_user_id
  for update;

  if v_last = v_today then
    return query select 0::integer, v_streak::integer;
    return;
  end if;

  if v_last = (v_today - 1) then
    v_streak := v_streak + 1;
  else
    v_streak := 1;
  end if;

  -- Milestone bonuses.
  if v_streak in (7, 14, 21, 30) then
    v_bonus := 20;
  end if;

  v_total := v_base + v_bonus;

  -- Daily credits expire quickly to encourage return.
  perform public.grant_credits(
    p_user_id,
    v_total,
    'bonus',
    'daily_checkin',
    now() + interval '7 days',
    'daily:' || v_today::text,
    jsonb_build_object('base', v_base, 'bonus', v_bonus, 'streak', v_streak),
    null,
    null
  );

  v_longest := greatest(v_longest, v_streak);

  update public.user_streaks
    set current_streak = v_streak,
        longest_streak = v_longest,
        last_claim_date = v_today,
        updated_at = now()
    where user_id = p_user_id;

  return query select v_total::integer, v_streak::integer;
end;
$$;

comment on function public.claim_daily_credits is 'Grants daily bonus credits (capped) with streak milestones; returns (granted, streak)';

-- ============================================================================
-- 6) Rate limiting primitives (server-authoritative)
-- ============================================================================

create table if not exists public.rate_limit_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  key text not null,
  bucket_start timestamptz not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, key, bucket_start)
);

alter table public.rate_limit_counters enable row level security;

-- No user access; Edge Functions + SECURITY DEFINER RPC only.
create policy "No direct access to rate limits"
  on public.rate_limit_counters for select
  using (false);

create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket_start timestamptz;
  v_count integer;
begin
  if p_limit is null or p_limit <= 0 then
    raise exception 'invalid_rate_limit';
  end if;
  if p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'invalid_rate_limit_window';
  end if;

  v_bucket_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limit_counters (user_id, key, bucket_start, count, updated_at)
  values (p_user_id, p_key, v_bucket_start, 1, now())
  on conflict (user_id, key, bucket_start) do update
    set count = public.rate_limit_counters.count + 1,
        updated_at = now()
  returning count into v_count;

  if v_count > p_limit then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  return v_count;
end;
$$;

comment on function public.check_rate_limit is 'Increments and enforces a fixed-window per-user rate limit; raises on exceed';

-- ============================================================================
-- 7) Analytics events (server-side logging)
-- ============================================================================

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_name on public.analytics_events(event_name);
create index if not exists idx_analytics_events_user on public.analytics_events(user_id);
create index if not exists idx_analytics_events_created on public.analytics_events(created_at desc);

alter table public.analytics_events enable row level security;

-- No direct access; log via Edge Function or service role.
create policy "No direct access to analytics events"
  on public.analytics_events for select
  using (false);

-- ============================================================================
-- 8) Credit products (packs/offers)
-- ============================================================================

create table if not exists public.credit_products (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  stripe_price_id text not null,
  currency text not null default 'usd',
  base_credits integer not null check (base_credits > 0),
  bonus_credits integer not null default 0 check (bonus_credits >= 0),
  bonus_expires_days integer,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  popularity_rank integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_credit_products_active on public.credit_products(is_active);
create index if not exists idx_credit_products_window on public.credit_products(starts_at, ends_at);

alter table public.credit_products enable row level security;

create policy "Anyone can view active credit products"
  on public.credit_products for select
  to public
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

-- ============================================================================
-- 9) Migrate existing balances into the ledger (best-effort)
-- ============================================================================

do $$
declare
  r record;
begin
  for r in select user_id, balance from public.credits where balance > 0 loop
    perform public.grant_credits(
      r.user_id,
      r.balance,
      'allowance',
      'legacy_balance_migration',
      null,
      'legacy:migration:v1',
      jsonb_build_object('note','migrated from credits.balance'),
      null,
      null
    );
  end loop;
end $$;

-- ============================================================================
-- 10) Update user creation trigger: endowment + referral
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_display_name text;
  v_referral_code text;
begin
  v_display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));

  insert into public.profiles (id, email, display_name)
  values (NEW.id, NEW.email, v_display_name)
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        updated_at = now();

  insert into public.user_roles (user_id, role)
  values (NEW.id, 'user')
  on conflict (user_id, role) do nothing;

  -- Legacy table (kept for compatibility with earlier schema).
  insert into public.user_credits (user_id)
  values (NEW.id)
  on conflict (user_id) do nothing;

  -- Ensure referral code exists for share.
  perform public.get_or_create_referral_code(NEW.id);

  -- Endowment: starter bonus credits (expiring for urgency).
  perform public.grant_credits(
    NEW.id,
    50,
    'bonus',
    'starter_endowment',
    now() + interval '14 days',
    'starter:' || NEW.id::text,
    jsonb_build_object('reason', 'welcome'),
    null,
    null
  );

  -- If signup included a referral code, redeem it (never block signup).
  v_referral_code := nullif(NEW.raw_user_meta_data->>'referral_code', '');
  if v_referral_code is not null then
    begin
      perform public.redeem_referral(NEW.id, v_referral_code);
    exception when others then
      -- swallow
    end;
  end if;

  return NEW;
end;
$$;

-- ============================================================================
-- 11) Lock down internal RPCs (Edge Functions / service_role only)
-- ============================================================================

Arevoke execute on function public.grant_credits(uuid, integer, public.credit_bucket, text, timestamptz, text, jsonb, text, text) from public;
revoke execute on functionA public.spend_credits(uuid, integer, text, text, jsonb) from public;
revoke execute on function public.get_or_create_referral_code(uuid) from public;
revoke execute on function public.redeem_referral(uuid, text) from public;
revoke execute on function public.award_referral_conversion(uuid, text) from public;
revoke execute on function public.claim_daily_credits(uuid) from public;
revoke execute on function public.check_rate_limit(uuid, text, integer, integer) from public;
revoke execute on function public.set_credits(uuid, integer) from public;
A
grant execute on function public.refresh_credits_balance(uuid) to service_role;
grant execute on function public.grant_credits(uuid, integer, public.credit_bucket, text, timestamptz, text, jsonb, text, text) to service_role;
grant execute on function public.spend_credits(uuid, integer, text, text, jsonb) to service_role;
grant execute on function public.get_or_create_referral_code(uuid) to service_role;
grant execute on function public.redeem_referral(uuid, text) to service_role;
grant execute on function public.award_referral_conversion(uuid, text) to service_role;
grant execute on function public.claim_daily_credits(uuid) to service_role;
grant execute on function public.check_rate_limit(uuid, text, integer, integer) to service_role;
grant execute on function public.set_credits(uuid, integer) to service_role;

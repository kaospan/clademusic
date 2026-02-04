-- Playback telemetry (controller-layer analytics)
-- Created 2026-02-04
--
-- Purpose:
-- - Count playback intents/sessions without rehosting audio
-- - Support provider-first playback where canonical track id may not be a DB UUID
-- - Avoid FK constraints to `tracks` for external provider-only playback
--
-- IMPORTANT:
-- - These are internal analytics events, not provider royalty "streams".

create extension if not exists "pgcrypto";

create table if not exists public.playback_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  anonymous_id text,
  session_id uuid not null,
  event_type text not null check (event_type in ('intent','state','qualified_play','link_out','error')),
  provider text not null,
  provider_track_id text,
  canonical_track_key text, -- e.g. UUID or 'spotify:<id>' / 'youtube:<id>'
  isrc text,
  position_ms integer,
  duration_ms integer,
  played_ms integer,
  context text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_playback_events_user_time on public.playback_events(user_id, created_at desc);
create index if not exists idx_playback_events_anon_time on public.playback_events(anonymous_id, created_at desc) where anonymous_id is not null;
create index if not exists idx_playback_events_session on public.playback_events(session_id, created_at asc);
create index if not exists idx_playback_events_provider on public.playback_events(provider, created_at desc);
create index if not exists idx_playback_events_isrc on public.playback_events(isrc) where isrc is not null;
create index if not exists idx_playback_events_canonical on public.playback_events(canonical_track_key) where canonical_track_key is not null;

alter table public.playback_events enable row level security;

-- Users can read their own events (authenticated only).
create policy "Users can view own playback events"
  on public.playback_events
  for select
  using (auth.uid() = user_id);

-- Users can insert their own events OR anonymous (guest) events.
create policy "Users can insert playback events"
  on public.playback_events
  for insert
  with check (auth.uid() = user_id or user_id is null);

comment on table public.playback_events is 'Controller-layer playback analytics (intents, sessions, qualified plays). Not a royalty settlement source.';


-- Harmonic analysis core tables and indexes
-- Created 2026-01-25

-- Extension for uuid generation if not already present
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Table: harmonic_fingerprints
create table if not exists public.harmonic_fingerprints (
  id uuid primary key default gen_random_uuid(),
  track_id text not null,
  isrc text,
  audio_hash text,
  tonal_center jsonb not null,
  roman_progression jsonb not null default '[]'::jsonb,
  loop_length_bars integer not null default 4 check (loop_length_bars > 0),
  cadence_type text not null,
  modal_color text,
  borrowed_chords jsonb,
  section_progressions jsonb,
  confidence_score numeric not null check (confidence_score >= 0 and confidence_score <= 1),
  analysis_timestamp timestamptz not null default now(),
  analysis_version text not null,
  is_provisional boolean not null default true,
  detected_key text,
  detected_mode text,
  reuse_until timestamptz generated always as (analysis_timestamp + interval '90 days') stored,
  reanalyze_after timestamptz generated always as (analysis_timestamp + interval '365 days') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Uniqueness and idempotency
create unique index if not exists idx_hf_track_id on public.harmonic_fingerprints(track_id);
create unique index if not exists idx_hf_audio_hash on public.harmonic_fingerprints(audio_hash) where audio_hash is not null;
create unique index if not exists idx_hf_isrc on public.harmonic_fingerprints(isrc) where isrc is not null;

-- Lookup and filtering indexes
create index if not exists idx_hf_roman_progression on public.harmonic_fingerprints using gin (roman_progression jsonb_path_ops);
create index if not exists idx_hf_cadence_type on public.harmonic_fingerprints(cadence_type);
create index if not exists idx_hf_loop_length_bars on public.harmonic_fingerprints(loop_length_bars);
create index if not exists idx_hf_confidence_score on public.harmonic_fingerprints(confidence_score);
create index if not exists idx_hf_reuse_until on public.harmonic_fingerprints(reuse_until);
create index if not exists idx_hf_reanalyze_after on public.harmonic_fingerprints(reanalyze_after);

-- Table: analysis_jobs
create table if not exists public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  track_id text not null,
  isrc text,
  audio_hash text,
  status text not null check (status in ('queued','processing','completed','failed','cached')),
  progress numeric not null default 0 check (progress >= 0 and progress <= 1),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  analysis_version text not null,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_aj_track_status on public.analysis_jobs(track_id, status);
create index if not exists idx_aj_started_at on public.analysis_jobs(started_at desc);
create index if not exists idx_aj_audio_hash on public.analysis_jobs(audio_hash) where audio_hash is not null;
create index if not exists idx_aj_isrc on public.analysis_jobs(isrc) where isrc is not null;

-- Disable RLS for now (can be enabled with policies later)
alter table public.harmonic_fingerprints disable row level security;
alter table public.analysis_jobs disable row level security;

-- Update timestamp trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_hf_updated_at on public.harmonic_fingerprints;
create trigger trg_hf_updated_at
before update on public.harmonic_fingerprints
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_aj_updated_at on public.analysis_jobs;
create trigger trg_aj_updated_at
before update on public.analysis_jobs
for each row execute procedure public.set_updated_at();

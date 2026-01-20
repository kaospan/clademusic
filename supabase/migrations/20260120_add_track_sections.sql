-- Track sections (canonical, provider-agnostic)
-- Enables seek-based playback for intro/verse/chorus/bridge/outro

create table public.track_sections (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  label text not null check (label in ('intro', 'verse', 'pre-chorus', 'chorus', 'bridge', 'outro', 'breakdown', 'drop')),
  start_ms integer not null check (start_ms >= 0),
  end_ms integer not null check (end_ms > start_ms),
  created_at timestamptz not null default now()
);

-- Performance indexes
create index idx_track_sections_track_id on public.track_sections(track_id);
create index idx_track_sections_label on public.track_sections(label);

-- RLS
alter table public.track_sections enable row level security;

-- Anyone can read sections (no privacy risk)
create policy "public read track sections"
on public.track_sections
for select
using (true);

-- Only service role / server may write (no client writes)
create policy "no client writes"
on public.track_sections
for all
using (false)
with check (false);

-- RPC function for fetching track sections (typed access from client)
create or replace function public.get_track_sections(p_track_id uuid)
returns table (
  id uuid,
  track_id uuid,
  label text,
  start_ms integer,
  end_ms integer,
  created_at timestamptz
)
language sql
stable
security definer
as $$
  select id, track_id, label, start_ms, end_ms, created_at
  from public.track_sections
  where track_id = p_track_id
  order by start_ms asc;
$$;

comment on table public.track_sections is 'Canonical song structure sections with timestamps for seek-based playback';
comment on column public.track_sections.label is 'Section type: intro, verse, pre-chorus, chorus, bridge, outro, breakdown, drop';
comment on column public.track_sections.start_ms is 'Section start time in milliseconds';
comment on column public.track_sections.end_ms is 'Section end time in milliseconds';
comment on function public.get_track_sections is 'Fetch all sections for a track, ordered by start time';

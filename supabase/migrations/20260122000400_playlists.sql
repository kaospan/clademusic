-- Playlist System
-- Created: 2026-01-22
-- Purpose: User-created playlists with collaborative features

-- Create playlists table
CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  is_public boolean DEFAULT true,
  is_collaborative boolean DEFAULT false,
  cover_url text,
  cover_color text, -- Hex color for auto-generated covers
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_played_at timestamptz,
  play_count integer DEFAULT 0,
  CONSTRAINT name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Create playlist_tracks table (join table)
CREATE TABLE IF NOT EXISTS public.playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
  track_id uuid REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, track_id)
);

-- Create playlist_collaborators table
CREATE TABLE IF NOT EXISTS public.playlist_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  can_edit boolean DEFAULT true,
  can_add_tracks boolean DEFAULT true,
  can_remove_tracks boolean DEFAULT true,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, user_id)
);

-- Create playlist_folders table
CREATE TABLE IF NOT EXISTS public.playlist_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  parent_folder_id uuid REFERENCES public.playlist_folders(id) ON DELETE CASCADE,
  position integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create playlist_folder_items table
CREATE TABLE IF NOT EXISTS public.playlist_folder_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES public.playlist_folders(id) ON DELETE CASCADE NOT NULL,
  playlist_id uuid REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
  position integer DEFAULT 0,
  UNIQUE(folder_id, playlist_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_playlists_user ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_public ON public.playlists(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_playlists_collaborative ON public.playlists(is_collaborative) WHERE is_collaborative = true;
CREATE INDEX IF NOT EXISTS idx_playlists_updated ON public.playlists(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON public.playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track ON public.playlist_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON public.playlist_tracks(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_added_by ON public.playlist_tracks(added_by);

CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_playlist ON public.playlist_collaborators(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_user ON public.playlist_collaborators(user_id);

CREATE INDEX IF NOT EXISTS idx_playlist_folders_user ON public.playlist_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_folders_parent ON public.playlist_folders(parent_folder_id);

-- RLS Policies
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_folder_items ENABLE ROW LEVEL SECURITY;

-- Playlists: Users can view their own and public playlists
CREATE POLICY "Users can view own playlists" ON public.playlists
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Public playlists viewable" ON public.playlists
FOR SELECT USING (is_public = true);

CREATE POLICY "Collaborators can view playlists" ON public.playlists
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.playlist_collaborators
    WHERE playlist_id = playlists.id AND user_id = auth.uid()
  )
);

-- Playlists: Users can manage own playlists
CREATE POLICY "Users can insert own playlists" ON public.playlists
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists" ON public.playlists
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlists" ON public.playlists
FOR DELETE USING (auth.uid() = user_id);

-- Playlist tracks: View based on playlist access
CREATE POLICY "Users can view playlist tracks" ON public.playlist_tracks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE id = playlist_tracks.playlist_id
    AND (user_id = auth.uid() OR is_public = true OR is_collaborative = true)
  )
);

-- Playlist tracks: Add/remove based on permissions
CREATE POLICY "Owners can manage playlist tracks" ON public.playlist_tracks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE id = playlist_tracks.playlist_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Collaborators can add tracks" ON public.playlist_tracks
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.playlist_collaborators
    WHERE playlist_id = playlist_tracks.playlist_id 
    AND user_id = auth.uid() 
    AND can_add_tracks = true
  )
);

CREATE POLICY "Collaborators can remove tracks" ON public.playlist_tracks
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.playlist_collaborators
    WHERE playlist_id = playlist_tracks.playlist_id 
    AND user_id = auth.uid() 
    AND can_remove_tracks = true
  )
);

-- Playlist collaborators: View own collaborations
CREATE POLICY "Users can view collaborators" ON public.playlist_collaborators
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE id = playlist_collaborators.playlist_id 
    AND (user_id = auth.uid() OR is_public = true)
  )
);

-- Playlist collaborators: Owners can manage
CREATE POLICY "Owners can manage collaborators" ON public.playlist_collaborators
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE id = playlist_collaborators.playlist_id AND user_id = auth.uid()
  )
);

-- Playlist folders: Users manage their own
CREATE POLICY "Users can manage own folders" ON public.playlist_folders
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage folder items" ON public.playlist_folder_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.playlist_folders
    WHERE id = playlist_folder_items.folder_id AND user_id = auth.uid()
  )
);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_playlist_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_playlist_timestamp();

-- Function to reorder playlist tracks
CREATE OR REPLACE FUNCTION public.reorder_playlist_tracks(
  p_playlist_id uuid,
  p_track_ids uuid[]
)
RETURNS void AS $$
DECLARE
  track_id uuid;
  idx integer := 0;
BEGIN
  -- Check if user has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.playlists
    WHERE id = p_playlist_id AND user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.playlist_collaborators
    WHERE playlist_id = p_playlist_id AND user_id = auth.uid() AND can_edit = true
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Update positions
  FOREACH track_id IN ARRAY p_track_ids
  LOOP
    UPDATE public.playlist_tracks
    SET position = idx
    WHERE playlist_id = p_playlist_id AND track_id = track_id;
    idx := idx + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reorder_playlist_tracks(uuid, uuid[]) TO authenticated;

-- Function to add tracks to playlist (with auto position)
CREATE OR REPLACE FUNCTION public.add_track_to_playlist(
  p_playlist_id uuid,
  p_track_id uuid
)
RETURNS uuid AS $$
DECLARE
  max_position integer;
  new_id uuid;
BEGIN
  -- Get current max position
  SELECT COALESCE(MAX(position), -1) INTO max_position
  FROM public.playlist_tracks
  WHERE playlist_id = p_playlist_id;

  -- Insert with next position
  INSERT INTO public.playlist_tracks (playlist_id, track_id, added_by, position)
  VALUES (p_playlist_id, p_track_id, auth.uid(), max_position + 1)
  ON CONFLICT (playlist_id, track_id) DO NOTHING
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.add_track_to_playlist(uuid, uuid) TO authenticated;

COMMENT ON TABLE public.playlists IS 'User-created playlists';
COMMENT ON TABLE public.playlist_tracks IS 'Tracks within playlists';
COMMENT ON TABLE public.playlist_collaborators IS 'Collaborative playlist permissions';
COMMENT ON TABLE public.playlist_folders IS 'Playlist organization folders';

-- Profile Theme System
-- Created: 2026-01-22
-- Purpose: Custom profile themes and styling

-- Create user_themes table
CREATE TABLE IF NOT EXISTS public.user_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  theme_name text NOT NULL DEFAULT 'custom',
  colors jsonb NOT NULL DEFAULT '{
    "background": "#000000",
    "surface": "#1a1a1a",
    "primary": "#3b82f6",
    "secondary": "#8b5cf6",
    "accent": "#f59e0b",
    "text": "#ffffff",
    "textMuted": "#9ca3af"
  }'::jsonb,
  fonts jsonb NOT NULL DEFAULT '{
    "heading": "Inter",
    "body": "Inter"
  }'::jsonb,
  layout text NOT NULL DEFAULT 'modern' CHECK (layout IN ('modern', 'minimal', 'retro', 'neon', 'academic')),
  custom_css text,
  banner_url text,
  profile_url_slug text UNIQUE,
  show_visitor_count boolean DEFAULT false,
  animated_background boolean DEFAULT false,
  player_skin text DEFAULT 'default' CHECK (player_skin IN ('default', 'compact', 'glassmorphism', 'retro', 'minimal')),
  is_public boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_themes_user ON public.user_themes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_themes_slug ON public.user_themes(profile_url_slug) WHERE profile_url_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_themes_public ON public.user_themes(is_public) WHERE is_public = true;

-- Create theme presets table
CREATE TABLE IF NOT EXISTS public.theme_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  colors jsonb NOT NULL,
  fonts jsonb NOT NULL,
  layout text NOT NULL,
  custom_css text,
  player_skin text DEFAULT 'default',
  animated_background boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  usage_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_theme_presets_featured ON public.theme_presets(is_featured) WHERE is_featured = true;

-- Insert default theme presets
INSERT INTO public.theme_presets (name, description, colors, fonts, layout, player_skin, animated_background, is_featured) VALUES
  ('Dark Modern', 'Sleek dark theme with blue accents', 
   '{"background": "#0a0a0a", "surface": "#1a1a1a", "primary": "#3b82f6", "secondary": "#8b5cf6", "accent": "#f59e0b", "text": "#ffffff", "textMuted": "#9ca3af"}'::jsonb,
   '{"heading": "Inter", "body": "Inter"}'::jsonb,
   'modern', 'glassmorphism', false, true),
  
  ('Minimal Light', 'Clean and minimal light theme',
   '{"background": "#ffffff", "surface": "#f9fafb", "primary": "#1f2937", "secondary": "#6b7280", "accent": "#3b82f6", "text": "#111827", "textMuted": "#6b7280"}'::jsonb,
   '{"heading": "Inter", "body": "Inter"}'::jsonb,
   'minimal', 'minimal', false, true),
  
  ('Neon Dreams', 'Vibrant neon with animated background',
   '{"background": "#0a0014", "surface": "#1a0028", "primary": "#ff00ff", "secondary": "#00ffff", "accent": "#ffff00", "text": "#ffffff", "textMuted": "#b19cd9"}'::jsonb,
   '{"heading": "Orbitron", "body": "Roboto"}'::jsonb,
   'neon', 'retro', true, true),
  
  ('Retro Wave', 'Synthwave inspired retro theme',
   '{"background": "#1a1a2e", "surface": "#16213e", "primary": "#ff006e", "secondary": "#8338ec", "accent": "#ffbe0b", "text": "#eaeaea", "textMuted": "#a8a8a8"}'::jsonb,
   '{"heading": "Press Start 2P", "body": "Roboto Mono"}'::jsonb,
   'retro', 'retro', false, true),
  
  ('Dark Academia', 'Scholarly dark theme with warm tones',
   '{"background": "#1c1917", "surface": "#292524", "primary": "#d97706", "secondary": "#78716c", "accent": "#b45309", "text": "#fafaf9", "textMuted": "#a8a29e"}'::jsonb,
   '{"heading": "Playfair Display", "body": "Lora"}'::jsonb,
   'academic', 'default', false, true)
ON CONFLICT (name) DO NOTHING;

-- RLS Policies
ALTER TABLE public.user_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_presets ENABLE ROW LEVEL SECURITY;

-- Users can view their own themes
CREATE POLICY "Users can view own themes" ON public.user_themes
FOR SELECT USING (auth.uid() = user_id);

-- Users can view public themes
CREATE POLICY "Public themes are viewable" ON public.user_themes
FOR SELECT USING (is_public = true);

-- Users can manage their own themes
CREATE POLICY "Users can manage own themes" ON public.user_themes
FOR ALL USING (auth.uid() = user_id);

-- Everyone can view theme presets
CREATE POLICY "Anyone can view presets" ON public.theme_presets
FOR SELECT USING (true);

-- Only admins can manage theme presets
CREATE POLICY "Admins can manage presets" ON public.theme_presets
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_user_theme_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_themes_updated_at
  BEFORE UPDATE ON public.user_themes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_theme_timestamp();

-- Function to increment theme preset usage
CREATE OR REPLACE FUNCTION public.increment_theme_usage(preset_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.theme_presets
  SET usage_count = usage_count + 1
  WHERE id = preset_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_theme_usage(uuid) TO authenticated;

COMMENT ON TABLE public.user_themes IS 'Custom profile themes for users';
COMMENT ON TABLE public.theme_presets IS 'Pre-made theme templates users can apply';

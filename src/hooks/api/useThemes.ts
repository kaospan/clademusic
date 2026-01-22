import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type UserTheme = Database['public']['Tables']['user_themes']['Row'];
type ThemePreset = Database['public']['Tables']['theme_presets']['Row'];
type ThemeInsert = Database['public']['Tables']['user_themes']['Insert'];
type ThemeUpdate = Database['public']['Tables']['user_themes']['Update'];

// Get current user's theme
export function useUserTheme(userId?: string) {
  return useQuery({
    queryKey: ['userTheme', userId],
    queryFn: async () => {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) throw new Error('No user ID provided');

      const { data, error } = await supabase
        .from('user_themes')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) throw error;
      return data as UserTheme | null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId || true,
  });
}

// Get theme presets
export function useThemePresets() {
  return useQuery({
    queryKey: ['themePresets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_presets')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data as ThemePreset[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get single theme preset
export function useThemePreset(presetId?: string) {
  return useQuery({
    queryKey: ['themePreset', presetId],
    queryFn: async () => {
      if (!presetId) return null;

      const { data, error } = await supabase
        .from('theme_presets')
        .select('*')
        .eq('id', presetId)
        .single();

      if (error) throw error;
      return data as ThemePreset;
    },
    enabled: !!presetId,
  });
}

// Create user theme
export function useCreateTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (theme: ThemeInsert) => {
      const { data, error } = await supabase
        .from('user_themes')
        .insert(theme)
        .select()
        .single();

      if (error) throw error;
      return data as UserTheme;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['userTheme', data.user_id] });
    },
  });
}

// Update user theme
export function useUpdateTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: ThemeUpdate }) => {
      const { data, error } = await supabase
        .from('user_themes')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as UserTheme;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['userTheme', data.user_id] });
    },
  });
}

// Delete user theme (reset to default)
export function useDeleteTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_themes')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['userTheme', userId] });
    },
  });
}

// Apply theme preset
export function useApplyPreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, presetId }: { userId: string; presetId: string }) => {
      // First, get the preset
      const { data: preset, error: presetError } = await supabase
        .from('theme_presets')
        .select('*')
        .eq('id', presetId)
        .single();

      if (presetError) throw presetError;

      // Increment usage count
      await supabase.rpc('increment_theme_usage', { preset_id: presetId });

      // Check if user theme exists
      const { data: existingTheme } = await supabase
        .from('user_themes')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingTheme) {
        // Update existing theme
        const { data, error } = await supabase
          .from('user_themes')
          .update({
            theme_name: preset.name,
            colors: preset.colors,
            fonts: preset.fonts,
            layout: preset.layout,
            custom_css: preset.custom_css,
            player_skin: preset.player_skin,
            animated_background: preset.animated_background,
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return data as UserTheme;
      } else {
        // Create new theme
        const { data, error } = await supabase
          .from('user_themes')
          .insert({
            user_id: userId,
            theme_name: preset.name,
            colors: preset.colors,
            fonts: preset.fonts,
            layout: preset.layout,
            custom_css: preset.custom_css,
            player_skin: preset.player_skin,
            animated_background: preset.animated_background,
          })
          .select()
          .single();

        if (error) throw error;
        return data as UserTheme;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['userTheme', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['themePresets'] });
    },
  });
}

// Get public profile theme by slug
export function usePublicTheme(slug?: string) {
  return useQuery({
    queryKey: ['publicTheme', slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from('user_themes')
        .select('*, profiles:user_id(username, display_name, avatar_url)')
        .eq('profile_url_slug', slug)
        .eq('is_public', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}

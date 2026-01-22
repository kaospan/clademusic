import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Check if current user is admin
export function useIsAdmin() {
  return useQuery({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase.rpc('is_admin', { user_id: user.id });
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }

      return data === true;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get all users with pagination and search
export function useAdminUsers(search?: string, limit = 20, offset = 0) {
  return useQuery({
    queryKey: ['adminUsers', search, limit, offset],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          user_roles(role)
        `, { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return { users: data, total: count || 0 };
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Get admin stats
export function useAdminStats() {
  return useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get active users (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: activeUsers } = await supabase
        .from('play_history')
        .select('user_id', { count: 'exact', head: true })
        .gte('played_at', sevenDaysAgo.toISOString());

      // Get total tracks
      const { count: totalTracks } = await supabase
        .from('tracks')
        .select('*', { count: 'exact', head: true });

      // Get total plays
      const { count: totalPlays } = await supabase
        .from('play_history')
        .select('*', { count: 'exact', head: true });

      // Get total interactions
      const { count: totalInteractions } = await supabase
        .from('user_interactions')
        .select('*', { count: 'exact', head: true });

      return {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalTracks: totalTracks || 0,
        totalPlays: totalPlays || 0,
        totalInteractions: totalInteractions || 0,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Get flagged content
export function useFlaggedContent(status = 'unresolved') {
  return useQuery({
    queryKey: ['flaggedContent', status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_interactions')
        .select(`
          *,
          user:user_id(username, email),
          track:track_id(title, artist)
        `)
        .eq('interaction_type', 'flag')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

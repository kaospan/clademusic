import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  sharing_enabled: boolean;
  radius_km: number;
}

export interface NearbyListener {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  distance_km: number;
  last_track?: string;
  last_artist?: string;
  listened_at?: string;
}

// Haversine formula to calculate distance
function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function useUserLocation() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-location', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_locations')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserLocation | null;
    },
    enabled: !!user,
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      latitude, 
      longitude, 
      sharingEnabled = true,
      radiusKm = 50
    }: { 
      latitude: number; 
      longitude: number; 
      sharingEnabled?: boolean;
      radiusKm?: number;
    }) => {
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('user_locations')
        .upsert({
          user_id: user.id,
          latitude,
          longitude,
          sharing_enabled: sharingEnabled,
          radius_km: radiusKm,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-location'] });
      queryClient.invalidateQueries({ queryKey: ['nearby-listeners'] });
    },
  });
}

export function useDisableLocationSharing() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');

      const { error } = await supabase
        .from('user_locations')
        .update({ sharing_enabled: false })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-location'] });
    },
  });
}

export function useNearbyListeners(trackId?: string, artist?: string) {
  const { user } = useAuth();
  const { data: userLocation } = useUserLocation();

  return useQuery({
    queryKey: ['nearby-listeners', trackId, artist, userLocation?.latitude, userLocation?.longitude],
    queryFn: async () => {
      if (!user || !userLocation?.sharing_enabled) return [];

      // Get all users who share their location
      const { data: locations, error: locError } = await supabase
        .from('user_locations')
        .select('*')
        .eq('sharing_enabled', true)
        .neq('user_id', user.id);

      if (locError) throw locError;

      // Filter by distance
      const nearbyUserIds = (locations || [])
        .filter((loc: any) => {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            Number(loc.latitude),
            Number(loc.longitude)
          );
          return distance <= userLocation.radius_km;
        })
        .map((loc: any) => ({
          user_id: loc.user_id,
          distance_km: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            Number(loc.latitude),
            Number(loc.longitude)
          ),
        }));

      if (nearbyUserIds.length === 0) return [];

      // Get profiles for nearby users
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', nearbyUserIds.map(u => u.user_id));

      if (profError) throw profError;

      // Get recent activity if filtering by track/artist
      let activityFilter: any[] = [];
      if (trackId || artist) {
        let activityQuery = supabase
          .from('nearby_activity')
          .select('*')
          .in('user_id', nearbyUserIds.map(u => u.user_id))
          .order('listened_at', { ascending: false });

        if (trackId) {
          activityQuery = activityQuery.eq('track_id', trackId);
        }
        if (artist) {
          // Escape ILIKE special characters
          const escapedArtist = artist.replace(/[%_]/g, '\\$&');
          activityQuery = activityQuery.ilike('artist', `%${escapedArtist}%`);
        }

        const { data: activity } = await activityQuery;
        activityFilter = activity || [];
      }

      // Combine data
      const listeners: NearbyListener[] = nearbyUserIds
        .map(({ user_id, distance_km }) => {
          const profile = (profiles || []).find((p: any) => p.id === user_id);
          const activity = activityFilter.find((a: any) => a.user_id === user_id);
          
          return {
            user_id,
            display_name: profile?.display_name || 'Anonymous',
            avatar_url: profile?.avatar_url,
            distance_km: Math.round(distance_km * 10) / 10,
            last_track: activity?.track_id,
            last_artist: activity?.artist,
            listened_at: activity?.listened_at,
          };
        })
        .filter(l => !trackId && !artist ? true : activityFilter.some(a => a.user_id === l.user_id));

      return listeners.sort((a, b) => a.distance_km - b.distance_km);
    },
    enabled: !!user && !!userLocation?.sharing_enabled,
  });
}

export function useRecordListeningActivity() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ trackId, artist }: { trackId: string; artist?: string }) => {
      if (!user) return;

      const { error } = await supabase
        .from('nearby_activity')
        .insert({
          user_id: user.id,
          track_id: trackId,
          artist: artist || null,
        });

      if (error) throw error;
    },
  });
}

/**
 * Nearby Listeners Panel Component
 * 
 * Shows a list of people nearby who listened to this song recently,
 * with their avatars, distance, and time ago.
 */

import { motion } from 'framer-motion';
import { MapPin, Users, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { NearbyListener } from '@/types';

interface NearbyListenersPanelProps {
  entityId: string;
  entityType: 'track' | 'album' | 'artist';
  className?: string;
}

// Mock data for demonstration
const mockNearbyListeners: NearbyListener[] = [
  {
    id: '1',
    user_id: 'u1',
    display_name: 'Alex M.',
    avatar_url: undefined,
    listened_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    distance_km: 0.5,
    city: 'Brooklyn',
  },
  {
    id: '2',
    user_id: 'u2',
    display_name: 'Sarah K.',
    avatar_url: undefined,
    listened_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    distance_km: 1.2,
    city: 'Manhattan',
  },
  {
    id: '3',
    user_id: 'u3',
    display_name: 'Mike T.',
    avatar_url: undefined,
    listened_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    distance_km: 2.8,
    city: 'Queens',
  },
  {
    id: '4',
    user_id: 'u4',
    display_name: 'Emma L.',
    avatar_url: undefined,
    listened_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    distance_km: 3.5,
    city: 'Bronx',
  },
  {
    id: '5',
    user_id: 'u5',
    display_name: 'James P.',
    avatar_url: undefined,
    listened_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    distance_km: 5.2,
    city: 'Jersey City',
  },
];

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m away`;
  }
  return `${km.toFixed(1)}km away`;
}

export function NearbyListenersPanel({ 
  entityId, 
  entityType,
  className 
}: NearbyListenersPanelProps) {
  const listeners = mockNearbyListeners;

  if (listeners.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="font-bold">Nearby Listeners</h3>
        <span className="text-xs text-muted-foreground">({listeners.length})</span>
      </div>

      {/* Avatar stack preview */}
      <div className="flex items-center gap-3 p-3 glass rounded-xl">
        <div className="flex -space-x-3">
          {listeners.slice(0, 5).map((listener, index) => (
            <motion.div
              key={listener.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Avatar className="w-10 h-10 border-2 border-background">
                <AvatarImage src={listener.avatar_url} />
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {listener.display_name[0]}
                </AvatarFallback>
              </Avatar>
            </motion.div>
          ))}
          {listeners.length > 5 && (
            <div className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground">
                +{listeners.length - 5}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">
            {listeners.length} {listeners.length === 1 ? 'person' : 'people'} nearby
          </p>
          <p className="text-xs text-muted-foreground">
            listened to this recently
          </p>
        </div>
      </div>

      {/* Full list */}
      <div className="space-y-2">
        {listeners.map((listener, index) => (
          <motion.div
            key={listener.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-3 glass rounded-xl hover:bg-muted/30 transition-colors cursor-pointer"
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={listener.avatar_url} />
              <AvatarFallback className="text-sm bg-primary/20 text-primary">
                {listener.display_name[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{listener.display_name}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {listener.distance_km !== undefined && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {formatDistance(listener.distance_km)}
                  </span>
                )}
                {listener.city && (
                  <span>{listener.city}</span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{formatDistanceToNow(new Date(listener.listened_at), { addSuffix: true })}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

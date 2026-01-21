import { Music2, TrendingUp, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';

interface FeedSidebarProps {
  currentTrack?: {
    title: string;
    artist?: string;
    detected_key?: string;
    detected_mode?: string;
    genre?: string;
    tempo?: number;
  };
  trackIndex: number;
  totalTracks: number;
}

export function FeedSidebar({ currentTrack, trackIndex, totalTracks }: FeedSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <GlassCard padding="lg" rounded="2xl">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Your Feed</h3>
            <span className="text-2xl font-bold gradient-text">
              {trackIndex + 1}/{totalTracks}
            </span>
          </div>
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${((trackIndex + 1) / totalTracks) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </GlassCard>

      {/* Current track info */}
      {currentTrack && (
        <GlassCard padding="lg" rounded="2xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Music2 className="w-4 h-4" />
              <h3 className="text-sm font-medium">Now Playing</h3>
            </div>
            
            <div>
              <h4 className="font-bold text-lg line-clamp-2">{currentTrack.title}</h4>
              {currentTrack.artist && (
                <p className="text-muted-foreground line-clamp-1">{currentTrack.artist}</p>
              )}
            </div>

            {/* Music metadata */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              {currentTrack.detected_key && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Key</span>
                  <span className="font-medium">
                    {currentTrack.detected_key} {currentTrack.detected_mode}
                  </span>
                </div>
              )}
              {currentTrack.tempo && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">BPM</span>
                  <span className="font-medium">{Math.round(currentTrack.tempo)}</span>
                </div>
              )}
              {currentTrack.genre && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Genre</span>
                  <span className="font-medium capitalize">{currentTrack.genre}</span>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard padding="md" rounded="xl" hover={false} className="text-center">
          <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Trending</p>
        </GlassCard>
        <GlassCard padding="md" rounded="xl" hover={false} className="text-center">
          <Clock className="w-5 h-5 text-accent mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Recent</p>
        </GlassCard>
      </div>

      {/* Keyboard shortcuts */}
      <GlassCard padding="md" rounded="xl" hover={false}>
        <h3 className="text-xs font-medium text-muted-foreground mb-3">Keyboard Shortcuts</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Next track</span>
            <kbd className="px-2 py-1 rounded bg-muted/50 font-mono">↓ or J</kbd>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Previous track</span>
            <kbd className="px-2 py-1 rounded bg-muted/50 font-mono">↑ or K</kbd>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

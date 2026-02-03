/**
 * Connections Page - WhoSampled-style track relationships
 * Shows how tracks sample, cover, interpolate, or remix each other
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BottomNav } from '@/components/BottomNav';
import { CladeLogoAnimated } from '@/components/icons/CladeIcon';
import { ProfileCircle } from '@/components/shared';
import { useTrackConnections, TrackConnectionRow, ConnectionGraphData } from '@/hooks/api/useConnections';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowRight,
  Music,
  TrendingUp,
  Link as LinkIcon,
  Badge as BadgeIcon,
} from 'lucide-react';
import { ConnectionType } from '@/types';

const CONNECTION_LABELS: Record<ConnectionType, { label: string; icon: string; color: string }> = {
  sample: { label: 'Sample', icon: '🎵', color: 'text-blue-500' },
  cover: { label: 'Cover', icon: '🎤', color: 'text-green-500' },
  interpolation: { label: 'Interpolation', icon: '🎹', color: 'text-purple-500' },
  remix: { label: 'Remix', icon: '🔄', color: 'text-orange-500' },
  inspiration: { label: 'Inspiration', icon: '💡', color: 'text-yellow-500' },
};

export default function ConnectionsPage() {
  const { trackId } = useParams<{ trackId: string }>();
  const navigate = useNavigate();
  const { data: connectionGraph, isLoading } = useTrackConnections(trackId!);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!connectionGraph) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 glass-strong safe-top">
          <div className="px-4 py-4 max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <CladeLogoAnimated size={22} className="text-primary" />
              <h1 className="text-xl font-bold">Connections</h1>
            </div>
            <ProfileCircle />
          </div>
        </header>

        <main className="px-4 py-8 max-w-lg mx-auto text-center">
          <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Track not found</p>
        </main>

        <BottomNav />
      </div>
    );
  }

  const { track, upstream, downstream, most_popular_derivative } = connectionGraph;
  const hasUpstream = upstream.length > 0;
  const hasDownstream = downstream.length > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong safe-top">
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <CladeLogoAnimated size={22} className="text-primary" />
            <h1 className="text-xl font-bold">Connections</h1>
          </div>
          <ProfileCircle />
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-6">
        {/* Main Track */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 glass rounded-2xl"
        >
          <div className="flex items-center gap-4">
            {track.cover_url && (
              <img
                src={track.cover_url}
                alt={track.title}
                className="w-20 h-20 rounded-xl object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg truncate">{track.title}</h2>
              <p className="text-muted-foreground truncate">
                {track.artist}
              </p>
              <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  {downstream.length} downstream
                </span>
                {hasUpstream && (
                  <span className="flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" />
                    {upstream.length} upstream
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Most Popular Derivative */}
        {most_popular_derivative && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              Most Popular Derivative
            </div>
            <div className="p-4 glass rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                  <Music className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{most_popular_derivative.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {most_popular_derivative.artist}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Upstream Connections (Origins) */}
        {hasUpstream && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              This song comes from ({upstream.length})
            </div>
            <div className="space-y-2">
              {upstream.map((connection, index) => {
                const connType = CONNECTION_LABELS[connection.connection_type] || CONNECTION_LABELS.sample;
                return (
                  <motion.div
                    key={connection.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + index * 0.05 }}
                    className="p-4 glass rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/connections/${connection.from_track_id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                        <Music className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${connType.color}`}>
                            {connType.icon} {connType.label}
                          </span>
                          {connection.confidence && (
                            <span className="text-xs text-muted-foreground">
                              {Math.round(connection.confidence * 100)}%
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium truncate text-sm">Track {connection.from_track_id.slice(0, 8)}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          Connection source
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Downstream Connections (Derivatives) */}
        {hasDownstream && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ArrowRight className="w-4 h-4" />
              This song influenced ({downstream.length})
            </div>
            <div className="space-y-2">
              {downstream.map((connection, index) => {
                const connType = CONNECTION_LABELS[connection.connection_type] || CONNECTION_LABELS.sample;
                return (
                  <motion.div
                    key={connection.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                    className="p-4 glass rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/connections/${connection.to_track_id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                        <Music className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium ${connType.color}`}>
                            {connType.icon} {connType.label}
                          </span>
                          {connection.confidence && (
                            <span className="text-xs text-muted-foreground">
                              {Math.round(connection.confidence * 100)}%
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium truncate text-sm">Track {connection.to_track_id.slice(0, 8)}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          Derivative work
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* No connections */}
        {!hasUpstream && !hasDownstream && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center py-12"
          >
            <LinkIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No connections found yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Be the first to add a connection!
            </p>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

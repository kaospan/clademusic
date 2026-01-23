/**
 * Album Page
 * 
 * Displays album details with:
 * - Album header with blurred background
 * - Track list with play buttons
 * - Sample connections for the album
 * - Nearby listeners
 * - Live comment feed with pinned comment
 */

import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Clock, Music, Calendar, Disc3, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BottomNav } from '@/components/BottomNav';
import { LiveCommentFeed } from '@/components/LiveCommentFeed';
import { SampleConnections } from '@/components/SampleConnections';
import { NearbyListenersPanel } from '@/components/NearbyListenersPanel';
import { cn } from '@/lib/utils';
import type { Album, Track } from '@/types';

// Mock album data
const mockAlbum: Album = {
  id: 'album-1',
  name: 'To Pimp a Butterfly',
  artist: 'Kendrick Lamar',
  artist_id: 'artist-kendrick',
  cover_url: 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1',
  release_date: '2015-03-15',
  total_tracks: 16,
  genres: ['Hip Hop', 'Jazz Rap', 'Conscious Hip Hop'],
  spotify_id: '7ycBtnsMtyVbbwTfJwRjSP',
  tracks: [
    { id: 't1', title: 'Wesley\'s Theory', artist: 'Kendrick Lamar', duration_ms: 288000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1' },
    { id: 't2', title: 'For Free? (Interlude)', artist: 'Kendrick Lamar', duration_ms: 134000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1' },
    { id: 't3', title: 'King Kunta', artist: 'Kendrick Lamar', duration_ms: 234000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1' },
    { id: 't4', title: 'Institutionalized', artist: 'Kendrick Lamar', duration_ms: 270000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1' },
    { id: 't5', title: 'These Walls', artist: 'Kendrick Lamar', duration_ms: 305000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1' },
    { id: 't6', title: 'u', artist: 'Kendrick Lamar', duration_ms: 268000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1' },
    { id: 't7', title: 'Alright', artist: 'Kendrick Lamar', duration_ms: 219000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1' },
    { id: 't8', title: 'For Sale? (Interlude)', artist: 'Kendrick Lamar', duration_ms: 289000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1' },
    { id: 't9', title: 'Momma', artist: 'Kendrick Lamar', duration_ms: 283000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1' },
    { id: 't10', title: 'Hood Politics', artist: 'Kendrick Lamar', duration_ms: 266000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1' },
  ] as Track[],
};

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatReleaseDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();

  // In a real app, fetch album data based on albumId
  const album = mockAlbum;

  const totalDuration = album.tracks?.reduce((sum, t) => sum + (t.duration_ms || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Side navigation - Desktop */}
      <div className="hidden lg:block">
        <BottomNav />
      </div>

      <div className="flex-1 pb-24 lg:pb-8">
        {/* Hero header with blurred background */}
        <div className="relative h-72 lg:h-80 overflow-hidden">
          {/* Blurred background */}
          <div 
            className="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-50"
            style={{ backgroundImage: `url(${album.cover_url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
          
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 z-10 p-2 rounded-full glass hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Share button */}
          <button className="absolute top-4 right-4 z-10 p-2 rounded-full glass hover:bg-muted/50 transition-colors">
            <Share2 className="w-5 h-5" />
          </button>

          {/* Album info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-40 h-40 lg:w-48 lg:h-48 rounded-xl overflow-hidden shadow-2xl shrink-0"
            >
              {album.cover_url ? (
                <img src={album.cover_url} alt={album.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Disc3 className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 min-w-0"
            >
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Album</p>
              <h1 className="text-2xl lg:text-4xl font-bold truncate">{album.name}</h1>
              <button 
                onClick={() => navigate(`/artist/${album.artist_id}`)}
                className="text-lg text-primary hover:underline mt-1"
              >
                {album.artist}
              </button>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                {album.release_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatReleaseDate(album.release_date)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Music className="w-4 h-4" />
                  {album.total_tracks} tracks
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {Math.floor(totalDuration / 60000)} min
                </span>
              </div>
              {album.genres && album.genres.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {album.genres.map(genre => (
                    <span key={genre} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 max-w-4xl lg:mx-auto space-y-8">
          {/* Play all button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <Play className="w-5 h-5 fill-current" />
              Play All
            </Button>
          </motion.div>

          {/* Track list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-2"
          >
            <h2 className="font-bold text-lg">Tracks</h2>
            <div className="space-y-1">
              {album.tracks?.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors group cursor-pointer"
                >
                  <span className="w-6 text-center text-muted-foreground text-sm group-hover:hidden">
                    {index + 1}
                  </span>
                  <Play className="w-4 h-4 hidden group-hover:block text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{track.title}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {track.duration_ms ? formatDurationFull(track.duration_ms) : '--:--'}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Sample Connections */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <SampleConnections 
              trackId={album.id} 
              trackTitle={album.name} 
            />
          </motion.div>

          {/* Nearby Listeners */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <NearbyListenersPanel 
              entityId={album.id} 
              entityType="album" 
            />
          </motion.div>

          {/* Live Comments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <LiveCommentFeed
              entityId={album.id}
              entityType="album"
              entityTitle={album.name}
            />
          </motion.div>
        </div>
      </div>

      {/* Bottom navigation - Mobile */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}

/**
 * Artist Page
 * 
 * Displays artist profile with:
 * - Artist header with background image
 * - Popular tracks section
 * - Discography (albums)
 * - Sample connections for the artist
 * - Nearby listeners
 * - Live comment feed with pinned comment
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Play, 
  Users, 
  Music, 
  Disc3, 
  Share2,
  Verified,
  Shuffle,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BottomNav } from '@/components/BottomNav';
import { LiveCommentFeed } from '@/components/LiveCommentFeed';
import { SampleConnections } from '@/components/SampleConnections';
import { NearbyListenersPanel } from '@/components/NearbyListenersPanel';
import { cn } from '@/lib/utils';
import type { Artist, Track, Album } from '@/types';

// Mock artist data
const mockArtist: Artist = {
  id: 'artist-kendrick',
  name: 'Kendrick Lamar',
  image_url: 'https://i.scdn.co/image/ab6761610000e5eb437b9e2a82505b3d93ff1022',
  genres: ['Hip Hop', 'Conscious Hip Hop', 'West Coast Hip Hop', 'Jazz Rap'],
  followers: 28500000,
  popularity: 92,
  spotify_id: '2YZyLoL8N0Wb9xBt1NhZWg',
  top_tracks: [
    { id: 't1', title: 'HUMBLE.', artist: 'Kendrick Lamar', duration_ms: 177000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273d28d2ebdedb220e479743797' },
    { id: 't2', title: 'All The Stars', artist: 'Kendrick Lamar, SZA', duration_ms: 232000, cover_url: 'https://i.scdn.co/image/ab67616d0000b2730153f5eb8cf3a7e2f2b2aecb' },
    { id: 't3', title: 'Money Trees', artist: 'Kendrick Lamar, Jay Rock', duration_ms: 387000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273d58e537cea05c2156792c53d' },
    { id: 't4', title: 'Swimming Pools (Drank)', artist: 'Kendrick Lamar', duration_ms: 313000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273d58e537cea05c2156792c53d' },
    { id: 't5', title: 'DNA.', artist: 'Kendrick Lamar', duration_ms: 186000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273d28d2ebdedb220e479743797' },
    { id: 't6', title: 'Alright', artist: 'Kendrick Lamar', duration_ms: 219000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1' },
    { id: 't7', title: 'King Kunta', artist: 'Kendrick Lamar', duration_ms: 234000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1' },
    { id: 't8', title: 'Poetic Justice', artist: 'Kendrick Lamar, Drake', duration_ms: 304000, cover_url: 'https://i.scdn.co/image/ab67616d0000b273d58e537cea05c2156792c53d' },
  ] as Track[],
  albums: [
    { id: 'a1', name: 'Mr. Morale & The Big Steppers', artist: 'Kendrick Lamar', artist_id: 'artist-kendrick', cover_url: 'https://i.scdn.co/image/ab67616d0000b2732e02117d76426a08ac7c174f', release_date: '2022-05-13', total_tracks: 18 },
    { id: 'a2', name: 'DAMN.', artist: 'Kendrick Lamar', artist_id: 'artist-kendrick', cover_url: 'https://i.scdn.co/image/ab67616d0000b273d28d2ebdedb220e479743797', release_date: '2017-04-14', total_tracks: 14 },
    { id: 'a3', name: 'To Pimp a Butterfly', artist: 'Kendrick Lamar', artist_id: 'artist-kendrick', cover_url: 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1', release_date: '2015-03-15', total_tracks: 16 },
    { id: 'a4', name: 'good kid, m.A.A.d city', artist: 'Kendrick Lamar', artist_id: 'artist-kendrick', cover_url: 'https://i.scdn.co/image/ab67616d0000b273d58e537cea05c2156792c53d', release_date: '2012-10-22', total_tracks: 12 },
  ] as Album[],
};

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatFollowers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export default function ArtistPage() {
  const { artistId } = useParams<{ artistId: string }>();
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('popular');

  // In a real app, fetch artist data based on artistId
  const artist = mockArtist;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Side navigation - Desktop */}
      <div className="hidden lg:block">
        <BottomNav />
      </div>

      <div className="flex-1 pb-24 lg:pb-8">
        {/* Hero header with gradient background */}
        <div className="relative h-72 lg:h-96 overflow-hidden">
          {/* Background image with blur */}
          <div 
            className="absolute inset-0 bg-cover bg-center scale-110 blur-sm opacity-60"
            style={{ backgroundImage: `url(${artist.image_url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background" />
          
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

          {/* Artist info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-32 h-32 lg:w-44 lg:h-44 rounded-full overflow-hidden shadow-2xl ring-4 ring-background shrink-0"
            >
              {artist.image_url ? (
                <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Users className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 min-w-0"
            >
              <div className="flex items-center gap-2">
                <Verified className="w-5 h-5 text-primary" />
                <p className="text-sm text-primary uppercase tracking-wider font-medium">Verified Artist</p>
              </div>
              <h1 className="text-3xl lg:text-5xl font-bold mt-1">{artist.name}</h1>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {formatFollowers(artist.followers || 0)} followers
                </span>
                {artist.popularity && (
                  <span className="flex items-center gap-1">
                    <Music className="w-4 h-4" />
                    {artist.popularity}% popularity
                  </span>
                )}
              </div>
              {artist.genres && artist.genres.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {artist.genres.slice(0, 4).map(genre => (
                    <span key={genre} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-4 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <Play className="w-5 h-5 fill-current" />
              Play
            </Button>
            <Button variant="outline" className="gap-2">
              <Shuffle className="w-4 h-4" />
              Shuffle
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsFollowing(!isFollowing)}
              className={cn(
                'gap-2',
                isFollowing && 'border-primary text-primary'
              )}
            >
              <Heart className={cn('w-4 h-4', isFollowing && 'fill-current')} />
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          </motion.div>
        </div>

        {/* Tabs Content */}
        <div className="px-4 py-6 max-w-4xl lg:mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="glass mb-6">
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="albums">Albums</TabsTrigger>
              <TabsTrigger value="samples">Samples</TabsTrigger>
              <TabsTrigger value="community">Community</TabsTrigger>
            </TabsList>

            {/* Popular Tracks */}
            <TabsContent value="popular" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <h2 className="font-bold text-lg">Popular</h2>
                <div className="space-y-1">
                  {artist.top_tracks?.map((track, index) => (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors group cursor-pointer"
                    >
                      <span className="w-6 text-center text-muted-foreground text-sm">
                        {index + 1}
                      </span>
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative">
                        {track.cover_url ? (
                          <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Music className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-current" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{track.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {track.duration_ms ? formatDuration(track.duration_ms) : '--:--'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Nearby Listeners */}
              <NearbyListenersPanel 
                entityId={artist.id} 
                entityType="artist" 
              />
            </TabsContent>

            {/* Albums / Discography */}
            <TabsContent value="albums" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <h2 className="font-bold text-lg">Discography</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {artist.albums?.map((album, index) => (
                    <motion.div
                      key={album.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => navigate(`/album/${album.id}`)}
                      className="group cursor-pointer"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden relative mb-2 shadow-lg">
                        {album.cover_url ? (
                          <img 
                            src={album.cover_url} 
                            alt={album.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Disc3 className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-12 h-12 text-white fill-current" />
                        </div>
                      </div>
                      <p className="font-medium text-sm truncate">{album.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {album.release_date ? new Date(album.release_date).getFullYear() : ''} • {album.total_tracks} tracks
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </TabsContent>

            {/* Sample Connections */}
            <TabsContent value="samples" className="space-y-6">
              <SampleConnections 
                trackId={artist.id} 
                trackTitle={artist.name} 
              />
            </TabsContent>

            {/* Community - Comments & Discussions */}
            <TabsContent value="community" className="space-y-6">
              <LiveCommentFeed
                entityId={artist.id}
                entityType="artist"
                entityTitle={artist.name}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Bottom navigation - Mobile */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from '@/components/BottomNav';
import { ChordBadge } from '@/components/ChordBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { seedTracks, progressionArchetypes } from '@/data/seedTracks';
import { Track } from '@/types';
import { Search, Music, TrendingUp, ArrowRight, Play, ExternalLink, Loader2, Clock, X, Filter, Zap, Heart, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { navigateToTrack } from '@/lib/navigation';
import { useAuth } from '@/hooks/useAuth';
import { searchSpotify } from '@/services/spotifySearchService';
import { searchYouTubeVideos } from '@/services/youtubeSearchService';
import { useSpotifyConnected } from '@/hooks/api/useSpotifyUser';
import { useConnectSpotify } from '@/hooks/api/useSpotifyConnect';
import { ResponsiveContainer, ResponsiveGrid } from '@/components/layout/ResponsiveLayout';
import { QuickStreamButtons } from '@/components/QuickStreamButtons';
import { CladeLogoAnimated } from '@/components/icons/CladeIcon';
import { ProfileCircle } from '@/components/shared';
import { usePlayer } from '@/player/PlayerContext';
import { 
  getSearchHistory, 
  addToSearchHistory, 
  removeFromHistory, 
  type SearchHistoryItem 
} from '@/lib/searchHistory';

export default function SearchPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: isSpotifyConnected } = useSpotifyConnected();
  const connectSpotify = useConnectSpotify();
  const { openPlayer } = usePlayer();
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'song' | 'chord'>('song');
  const [spotifyResults, setSpotifyResults] = useState<Track[]>([]);
  const [spotifyTotal, setSpotifyTotal] = useState(0);
  const [spotifyOffset, setSpotifyOffset] = useState(0);
  const [youtubeResults, setYoutubeResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [energyFilter, setEnergyFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [moodFilter, setMoodFilter] = useState<'all' | 'happy' | 'sad' | 'neutral'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Load search history on mount
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // Debug: Log seedTracks on mount
  useEffect(() => {
    console.log('🔍 SearchPage mounted');
    console.log('📊 seedTracks count:', seedTracks.length);
    console.log('📦 First track:', seedTracks[0]);
  }, []);

  // Debounced Spotify search
  useEffect(() => {
    if (searchMode !== 'song' || !query.trim() || !user || !isSpotifyConnected) {
      setSpotifyResults([]);
      setSpotifyTotal(0);
      setSpotifyOffset(0);
      return;
    }

    setSpotifyOffset(0);
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { tracks, total } = await searchSpotify(user.id, query, 50, 0);
        setSpotifyResults(tracks);
        setSpotifyTotal(total);
        setSpotifyOffset(tracks.length);
      } catch (error) {
        console.error('Spotify search error:', error);
        setSpotifyResults([]);
        setSpotifyTotal(0);
        setSpotifyOffset(0);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce for instant feel

    return () => clearTimeout(timer);
  }, [query, searchMode, user, isSpotifyConnected]);

  const loadMoreSpotify = React.useCallback(async () => {
    if (!user) return;
    setIsSearching(true);
    try {
      const { tracks, total } = await searchSpotify(user.id, query, 50, spotifyOffset);
      setSpotifyResults((prev) => [...prev, ...tracks]);
      setSpotifyTotal(total);
      setSpotifyOffset((prev) => prev + tracks.length);
    } catch (error) {
      console.error('Spotify load-more error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [user, query, spotifyOffset]);

  // YouTube search fallback when Spotify is not connected
  useEffect(() => {
    let cancelled = false;
    if (searchMode !== 'song' || !query.trim() || isSpotifyConnected) {
      setYoutubeResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const yt = await searchYouTubeVideos(query, '');
        if (cancelled) return;
        const mapped: Track[] = yt.map(v => ({
          id: `youtube:${v.videoId}`,
          title: v.title,
          artist: v.channel,
          youtube_id: v.videoId,
          provider: 'youtube',
        } as Track));
        setYoutubeResults(mapped);
      } catch (err) {
        console.error('YouTube search error:', err);
        setYoutubeResults([]);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searchMode, isSpotifyConnected]);

  // Instant local search with memoization for zero-latency feel
  const results = useMemo(() => {
    let filtered: Track[] = [];

    // Step 1: Text search filtering
    if (searchMode === 'song') {
      const lowerQuery = query.toLowerCase();
      filtered = seedTracks.filter(
        (t) =>
          !query.trim() || // Include all if no query
          t.title?.toLowerCase().includes(lowerQuery) ||
          t.artist?.toLowerCase().includes(lowerQuery) ||
          t.album?.toLowerCase().includes(lowerQuery) ||
          t.genre?.toLowerCase().includes(lowerQuery) ||
          t.genre_description?.toLowerCase().includes(lowerQuery)
      );
    } else {
      // Chord progression search
      const chords = query
        .toUpperCase()
        .split(/[-–—,\s]+/)
        .map((c) => c.trim())
        .filter(Boolean);
      
      filtered = seedTracks.filter((t) => {
        if (!t.progression_roman) return false;
        const progression = t.progression_roman.map((c) => c.toUpperCase());
        return chords.length === 0 || chords.every((chord) => 
          progression.includes(chord) || progression.includes(chord.toLowerCase())
        );
      });
    }

    // Step 2: Genre filtering
    if (selectedGenres.length > 0) {
      filtered = filtered.filter((t) => {
        const trackGenres = [t.genre, ...(t.genres || [])].filter(Boolean).map(g => g?.toLowerCase());
        return selectedGenres.some(selectedGenre => 
          trackGenres.some(tg => tg?.includes(selectedGenre.toLowerCase()))
        );
      });
    }

    // Step 3: Energy filtering (high: >0.7, medium: 0.4-0.7, low: <0.4)
    if (energyFilter !== 'all') {
      filtered = filtered.filter((t) => {
        if (typeof t.energy !== 'number') return false;
        if (energyFilter === 'high') return t.energy > 0.7;
        if (energyFilter === 'medium') return t.energy >= 0.4 && t.energy <= 0.7;
        if (energyFilter === 'low') return t.energy < 0.4;
        return true;
      });
    }

    // Step 4: Mood filtering (happy: valence >0.6, sad: <0.4, neutral: 0.4-0.6)
    if (moodFilter !== 'all') {
      filtered = filtered.filter((t) => {
        if (typeof t.valence !== 'number') return false;
        if (moodFilter === 'happy') return t.valence > 0.6;
        if (moodFilter === 'sad') return t.valence < 0.4;
        if (moodFilter === 'neutral') return t.valence >= 0.4 && t.valence <= 0.6;
        return true;
      });
    }

    // Step 5: Sort by relevance
    if (query.trim() && searchMode === 'song') {
      const lowerQuery = query.toLowerCase();
      return filtered.sort((a, b) => {
        const aTitle = a.title?.toLowerCase() || '';
        const bTitle = b.title?.toLowerCase() || '';
        const aArtist = a.artist?.toLowerCase() || '';
        const bArtist = b.artist?.toLowerCase() || '';
        
        if (aTitle.startsWith(lowerQuery) && !bTitle.startsWith(lowerQuery)) return -1;
        if (!aTitle.startsWith(lowerQuery) && bTitle.startsWith(lowerQuery)) return 1;
        if (aArtist.startsWith(lowerQuery) && !bArtist.startsWith(lowerQuery)) return -1;
        if (!aArtist.startsWith(lowerQuery) && bArtist.startsWith(lowerQuery)) return 1;
        
        return 0;
      });
    }

    return filtered;
  }, [query, searchMode, selectedGenres, energyFilter, moodFilter]);

  const normalizeSpotifyTrackId = (raw?: string | null) => {
    if (!raw) return null;
    if (raw.startsWith('spotify:track:')) return raw.split(':').pop() || null;
    if (raw.startsWith('spotify:')) return raw.split(':').pop() || null;
    const match = raw.match(/track\/([A-Za-z0-9]+)/);
    if (match?.[1]) return match[1];
    if (raw.includes('?')) return raw.split('?')[0].split('/').pop() || null;
    return raw;
  };

  const normalizeYouTubeVideoId = (raw?: string | null) => {
    if (!raw) return null;
    const direct = raw.trim();
    if (direct.startsWith('youtube:')) {
      const candidate = direct.split(':').pop() || '';
      if (/^[A-Za-z0-9_-]{11}$/.test(candidate)) return candidate;
    }
    if (/^[A-Za-z0-9_-]{11}$/.test(direct)) return direct;
    const shortMatch = direct.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    if (shortMatch?.[1]) return shortMatch[1];
    const paramMatch = direct.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    if (paramMatch?.[1]) return paramMatch[1];
    return null;
  };

  const handleOpenDetails = (track: Track, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const trackId = track.id || track.spotify_id || track.external_id;
    if (trackId) {
      navigateToTrack(navigate, trackId);
    }
  };

  const handlePlayOnProvider = (track: Track) => {
    // Add to search history
    if (query.trim()) {
      addToSearchHistory({
        query: query.trim(),
        type: searchMode,
        track: searchMode === 'song' ? track : undefined,
      });
      setSearchHistory(getSearchHistory());
    }
    
    const spotifyTrackId = normalizeSpotifyTrackId(
      track.spotify_id ||
        (track.id?.startsWith('spotify:') ? track.id : null) ||
        track.url_spotify_web ||
        track.url_spotify_app ||
        null
    );
    const youtubeVideoId = normalizeYouTubeVideoId(
      track.youtube_id ||
        (track.id?.startsWith('youtube:') ? track.id : null) ||
        track.url_youtube ||
        null
    );

    if (track.provider === 'youtube' && youtubeVideoId) {
      openPlayer({
        canonicalTrackId: track.id,
        provider: 'youtube',
        providerTrackId: youtubeVideoId,
        autoplay: true,
        context: 'search-result',
        title: track.title,
        artist: track.artist,
      });
      return;
    }

    if (track.provider === 'spotify' && spotifyTrackId) {
      if (!user) {
        navigate('/auth');
        return;
      }
      if (isSpotifyConnected !== true) {
        void connectSpotify.mutateAsync();
        return;
      }

      openPlayer({
        canonicalTrackId: track.id,
        provider: 'spotify',
        providerTrackId: spotifyTrackId,
        autoplay: true,
        context: 'search-result',
        title: track.title,
        artist: track.artist,
      });
      return;
    }

    // Generic fallback: prefer Spotify if connected, otherwise YouTube if available.
    if (spotifyTrackId && user && isSpotifyConnected === true) {
      openPlayer({
        canonicalTrackId: track.id,
        provider: 'spotify',
        providerTrackId: spotifyTrackId,
        autoplay: true,
        context: 'search-result',
        title: track.title,
        artist: track.artist,
      });
      return;
    }

    if (youtubeVideoId) {
      openPlayer({
        canonicalTrackId: track.id,
        provider: 'youtube',
        providerTrackId: youtubeVideoId,
        autoplay: true,
        context: 'search-result',
        title: track.title,
        artist: track.artist,
      });
      return;
    }

    if (spotifyTrackId) {
      if (!user) {
        navigate('/auth');
        return;
      }
      if (isSpotifyConnected !== true) {
        void connectSpotify.mutateAsync();
        return;
      }

      openPlayer({
        canonicalTrackId: track.id,
        provider: 'spotify',
        providerTrackId: spotifyTrackId,
        autoplay: true,
        context: 'search-result',
        title: track.title,
        artist: track.artist,
      });
      return;
    }

    // Fallback to track detail page with proper ID encoding
    const trackId = track.id || track.spotify_id || track.external_id;
    if (trackId) {
      navigateToTrack(navigate, trackId);
    }
  };

  const handleRemoveHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromHistory(id);
    setSearchHistory(getSearchHistory());
  };

  const handleHistoryClick = (item: SearchHistoryItem) => {
    if (item.track) {
      handlePlayOnProvider(item.track);
    } else {
      setQuery(item.query);
      setSearchMode(item.type);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong safe-top">
        <ResponsiveContainer maxWidth="full">
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between pl-36 sm:pl-44">
              <div className="flex items-center gap-3">
                <CladeLogoAnimated size={22} className="text-primary" />
                <h1 className="text-xl lg:text-2xl font-bold">Search</h1>
              </div>
              <ProfileCircle />
            </div>
            
            {/* Search mode toggle */}
            <div className="flex gap-2">
              <Button
                variant={searchMode === 'song' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchMode('song')}
                className="flex-1"
              >
                <Music className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Song / Artist</span>
                <span className="sm:hidden">Song</span>
              </Button>
              <Button
                variant={searchMode === 'chord' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchMode('chord')}
                className="flex-1"
              >
                <TrendingUp className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Chord Progression</span>
                <span className="sm:hidden">Chords</span>
              </Button>
            </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={
                searchMode === 'song'
                  ? 'Search songs or artists...'
                  : 'e.g., vi-IV-I-V or I-V-vi-IV'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 bg-muted/50"
              autoFocus
            />
          </div>

          {/* Filter toggle button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {(selectedGenres.length > 0 || energyFilter !== 'all' || moodFilter !== 'all') && (
              <Badge variant="secondary" className="ml-2">
                {selectedGenres.length + (energyFilter !== 'all' ? 1 : 0) + (moodFilter !== 'all' ? 1 : 0)}
              </Badge>
            )}
          </Button>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 pt-2">
                  {/* Genre filters */}
                  <div>
                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Music className="w-4 h-4" />
                      Genre
                      {selectedGenres.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedGenres([])}
                          className="h-6 text-xs"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['pop', 'rock', 'hip hop', 'r&b', 'jazz', 'funk', 'soul', 'blues', 'country', 'disco', 'synthpop', 'reggae', 'punk'].map((genre) => (
                        <Badge
                          key={genre}
                          variant={selectedGenres.includes(genre) ? 'default' : 'outline'}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setSelectedGenres(prev =>
                              prev.includes(genre)
                                ? prev.filter(g => g !== genre)
                                : [...prev, genre]
                            );
                          }}
                        >
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Energy filter */}
                  <div>
                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Energy
                    </div>
                    <div className="flex gap-2">
                      {[
                        { value: 'all', label: 'All' },
                        { value: 'high', label: 'High Energy' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'low', label: 'Chill' },
                      ].map((option) => (
                        <Badge
                          key={option.value}
                          variant={energyFilter === option.value ? 'default' : 'outline'}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setEnergyFilter(option.value as typeof energyFilter)}
                        >
                          {option.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Mood filter */}
                  <div>
                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Mood
                    </div>
                    <div className="flex gap-2">
                      {[
                        { value: 'all', label: 'All', icon: Sparkles },
                        { value: 'happy', label: 'Happy', icon: '😊' },
                        { value: 'neutral', label: 'Neutral', icon: '😐' },
                        { value: 'sad', label: 'Melancholic', icon: '😢' },
                      ].map((option) => (
                        <Badge
                          key={option.value}
                          variant={moodFilter === option.value ? 'default' : 'outline'}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setMoodFilter(option.value as typeof moodFilter)}
                        >
                          {typeof option.icon === 'string' ? option.icon : ''} {option.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </ResponsiveContainer>
      </header>

      {/* Content */}
      <main className="py-4 space-y-6">
        <ResponsiveContainer maxWidth="full">
        {/* Recent Searches - Show when no active search */}
        {!query && searchHistory.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Searches
            </h2>
            <div className="space-y-2">
              {searchHistory.slice(0, 10).map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleHistoryClick(item)}
                  className="p-3 glass rounded-lg cursor-pointer hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                      {item.type === 'song' ? (
                        <Music className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {item.track ? (
                        <>
                          <div className="font-medium truncate">{item.track.title}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {item.track.artist}
                          </div>
                        </>
                      ) : (
                        <div className="font-medium">{item.query}</div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleRemoveHistory(item.id, e)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Quick chord searches */}
        {searchMode === 'chord' && !query && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              Popular Progressions
            </h2>
            <div className="space-y-2">
              {progressionArchetypes.slice(0, 5).map((archetype, index) => (
                <motion.button
                  key={archetype.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setQuery(archetype.progression.join('-'))}
                  className="w-full p-4 glass rounded-xl text-left group hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{archetype.name}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {archetype.progression.map((chord, i) => (
                      <ChordBadge key={i} chord={chord} size="sm" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {archetype.description}
                  </p>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* No results message */}
        {query && spotifyResults.length === 0 && youtubeResults.length === 0 && results.length === 0 && !isSearching && (
          <section>
            <div className="glass rounded-2xl p-8 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                <Search className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">No results for "{query}"</h3>
                {(selectedGenres.length > 0 || energyFilter !== 'all' || moodFilter !== 'all') ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-2">
                      No tracks match your search with the selected filters
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedGenres([]);
                        setEnergyFilter('all');
                        setMoodFilter('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-1">
                      Searched {seedTracks.length} tracks with chord progressions
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Try searching for artist names like "weeknd" or chord progressions like "vi-IV-I-V"
                    </p>
                  </>
                )}
              </div>
              {!isSpotifyConnected && (
                <div className="glass-strong rounded-xl p-6 space-y-3 mt-6">
                  <div className="flex items-center justify-center gap-2 text-[#1DB954]">
                    <ExternalLink className="w-5 h-5" />
                    <span className="font-semibold">Unlock unlimited search</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connect Spotify to search millions of songs beyond the local database
                  </p>
                  <Button
                    onClick={() => navigate('/profile')}
                    className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white"
                    size="lg"
                  >
                    Connect Spotify
                  </Button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Search results */}
        {(spotifyResults.length > 0 || youtubeResults.length > 0 || results.length > 0) && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 flex-wrap">
                Results ({spotifyResults.length + youtubeResults.length + results.length})
                {isSearching && <Loader2 className="w-3 h-3 animate-spin" />}
                {spotifyResults.length > 0 && (
                  <span className="text-[#1DB954] text-xs">via Spotify</span>
                )}
                {youtubeResults.length > 0 && (
                  <span className="text-xs text-red-500">via YouTube</span>
                )}
                {results.length > 0 && (
                  <span className="text-xs text-purple-500">via Local DB</span>
                )}
              </h2>
              {(selectedGenres.length > 0 || energyFilter !== 'all' || moodFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedGenres([]);
                    setEnergyFilter('all');
                    setMoodFilter('all');
                  }}
                  className="h-7 text-xs"
                >
                  Clear Filters
                </Button>
              )}
            </div>
            
            {/* Active filters display */}
            {(selectedGenres.length > 0 || energyFilter !== 'all' || moodFilter !== 'all') && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedGenres.map((genre) => (
                  <Badge key={genre} variant="secondary" className="text-xs">
                    {genre}
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={() => setSelectedGenres(prev => prev.filter(g => g !== genre))}
                    />
                  </Badge>
                ))}
                {energyFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    {energyFilter} energy
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={() => setEnergyFilter('all')}
                    />
                  </Badge>
                )}
                {moodFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    <Heart className="w-3 h-3 mr-1" />
                    {moodFilter}
                    <X
                      className="w-3 h-3 ml-1 cursor-pointer"
                      onClick={() => setMoodFilter('all')}
                    />
                  </Badge>
                )}
              </div>
            )}

            <div className="space-y-2">
              {/* Spotify results first */}
              {spotifyResults.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-4 glass rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handlePlayOnProvider(track)}
                >
                  <div className="flex gap-4">
                    {track.cover_url && (
                      <img
                        src={track.cover_url}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{track.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {track.artist}
                      </p>
                      {track.album && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {track.album}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        onClick={(e) => handleOpenDetails(track, e)}
                        title="Details"
                        aria-label={`Open details for ${track.title}`}
                      >
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                      <QuickStreamButtons
                        track={{
                          spotifyId: track.spotify_id ?? track.id,
                          youtubeId: track.youtube_id,
                          urlSpotifyWeb: track.url_spotify_web,
                        }}
                        canonicalTrackId={track.id}
                        trackTitle={track.title}
                        trackArtist={track.artist}
                        size="md"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}

              {spotifyResults.length < spotifyTotal && (
                <div className="flex justify-center py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMoreSpotify}
                    disabled={isSearching}
                  >
                    {isSearching ? 'Loading…' : 'Load more Spotify results'}
                  </Button>
                </div>
              )}
              {/* YouTube search results (fallback when Spotify not connected) */}
              {youtubeResults.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-4 glass rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handlePlayOnProvider(track)}
                >
                  <div className="flex gap-4">
                    {track.cover_url && (
                      <img
                        src={track.cover_url}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{track.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {track.artist}
                      </p>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        onClick={(e) => handleOpenDetails(track, e)}
                        title="Details"
                        aria-label={`Open details for ${track.title}`}
                      >
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                      <QuickStreamButtons
                        track={{
                          youtubeId: track.youtube_id,
                          spotifyId: track.spotify_id,
                          urlYoutube: track.url_youtube,
                        }}
                        canonicalTrackId={track.id}
                        trackTitle={track.title}
                        trackArtist={track.artist}
                        size="md"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* Local seed track results */}
              {results.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-4 glass rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handlePlayOnProvider(track)}
                >
                  <div className="flex gap-4">
                    {track.cover_url && (
                      <img
                        src={track.cover_url}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{track.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {track.artist}
                      </p>
                      {track.progression_roman && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {track.progression_roman.map((chord, i) => (
                            <ChordBadge 
                              key={i} 
                              chord={chord} 
                              size="sm" 
                              keySignature={track.detected_key}
                            />
                          ))}
                        </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        onClick={(e) => handleOpenDetails(track, e)}
                        title="Details"
                        aria-label={`Open details for ${track.title}`}
                      >
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                        <QuickStreamButtons
                          track={{
                            spotifyId: track.spotify_id,
                            youtubeId: track.youtube_id,
                            urlYoutube: track.url_youtube,
                            urlSpotifyWeb: track.url_spotify_web,
                          }}
                          canonicalTrackId={track.id}
                          trackTitle={track.title}
                          trackArtist={track.artist}
                          size="md"
                          className="justify-end"
                        />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Trending section when no query */}
        {!query && searchMode === 'song' && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              Trending Tracks
            </h2>
            <div className="space-y-2">
              {seedTracks.slice(0, 10).map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-4 glass rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handlePlayOnProvider(track)}
                >
                  <div className="flex gap-4">
                    <div className="flex items-center justify-center w-8 text-lg font-bold text-muted-foreground">
                      {index + 1}
                    </div>
                    {track.cover_url && (
                      <img
                        src={track.cover_url}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{track.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {track.artist}
                      </p>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={(e) => handleOpenDetails(track, e)}
                        title="Details"
                        aria-label={`Open details for ${track.title}`}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                      <QuickStreamButtons
                        track={{
                          spotifyId: track.spotify_id,
                          youtubeId: track.youtube_id,
                          urlYoutube: track.url_youtube,
                          urlSpotifyWeb: track.url_spotify_web,
                        }}
                        canonicalTrackId={track.id}
                        trackTitle={track.title}
                        trackArtist={track.artist}
                        size="sm"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}
        </ResponsiveContainer>
      </main>

      <BottomNav />
    </div>
  );
}

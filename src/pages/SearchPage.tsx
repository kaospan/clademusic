import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BottomNav } from '@/components/BottomNav';
import { ChordBadge } from '@/components/ChordBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { seedTracks, progressionArchetypes } from '@/data/seedTracks';
import { Track } from '@/types';
import { Search, Music, TrendingUp, ArrowRight, Play, ExternalLink, Loader2, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { openProviderLink, getProviderLinks } from '@/lib/providers';
import { useAuth } from '@/hooks/useAuth';
import { searchSpotify } from '@/services/spotifySearchService';
import { useSpotifyConnected } from '@/hooks/api/useSpotifyUser';
import { ResponsiveContainer, ResponsiveGrid } from '@/components/layout/ResponsiveLayout';
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
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'song' | 'chord'>('song');
  const [spotifyResults, setSpotifyResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  // Debounced Spotify search
  useEffect(() => {
    if (searchMode !== 'song' || !query.trim() || !user || !isSpotifyConnected) {
      setSpotifyResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchSpotify(user.id, query, 20);
        setSpotifyResults(results);
      } catch (error) {
        console.error('Spotify search error:', error);
        setSpotifyResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [query, searchMode, user, isSpotifyConnected]);

  // Real-time search results (local seed tracks)
  const results = useMemo(() => {
    if (!query.trim()) return [];

    if (searchMode === 'song') {
      // Search by song/artist
      const lowerQuery = query.toLowerCase();
      return seedTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(lowerQuery) ||
          t.artist?.toLowerCase().includes(lowerQuery) ||
          t.album?.toLowerCase().includes(lowerQuery)
      );
    } else {
      // Search by chord progression
      const chords = query
        .toUpperCase()
        .split(/[-–—,\s]+/)
        .map((c) => c.trim())
        .filter(Boolean);
      
      return seedTracks.filter((t) => {
        if (!t.progression_roman) return false;
        const progression = t.progression_roman.map((c) => c.toUpperCase());
        return chords.every((chord) => 
          progression.includes(chord) || progression.includes(chord.toLowerCase())
        );
      });
    }
  }, [query, searchMode]);

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
    
    // Navigate to track detail page with proper ID encoding
    const trackId = track.id || track.spotify_id || track.external_id;
    if (trackId) {
      navigate(`/track/${encodeURIComponent(trackId)}`);
    }
  };

  const handleRemoveHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromHistory(id);
    setSearchHistory(getSearchHistory());
  };

  const handleHistoryClick = (item: SearchHistoryItem) => {
    if (item.track) {
      navigate(`/track/${encodeURIComponent(item.track.id)}`);
    } else {
      setQuery(item.query);
      setSearchMode(item.type);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong safe-top">
        <ResponsiveContainer maxWidth="2xl">
          <div className="py-4 space-y-3">
            <h1 className="text-xl lg:text-2xl font-bold">Search</h1>
            
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
          </div>
        </ResponsiveContainer>
      </header>

      {/* Content */}
      <main className="py-4 space-y-6">
        <ResponsiveContainer maxWidth="2xl">
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

        {/* Search results */}
        {(spotifyResults.length > 0 || results.length > 0) && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              Results ({spotifyResults.length + results.length})
              {isSearching && <Loader2 className="w-3 h-3 animate-spin" />}
              {spotifyResults.length > 0 && (
                <span className="text-[#1DB954] text-xs">via Spotify</span>
              )}
            </h2>
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
                    <div className="flex items-center">
                      <Play className="w-4 h-4 text-muted-foreground" />
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
                  className="p-4 glass rounded-xl"
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
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePlayOnProvider(track)}
                        title="Play on streaming service"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      {track.url_youtube && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(track.url_youtube!, '_blank')}
                          title="Open on YouTube"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* No results */}
        {query && spotifyResults.length === 0 && results.length === 0 && !isSearching && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No results found for "{query}"</p>
            <p className="text-sm text-muted-foreground mt-1">
              {!isSpotifyConnected && user ? 'Connect Spotify for full catalog access' : 'Try a different search term'}
            </p>
          </div>
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
                  className="p-4 glass rounded-xl"
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => handlePlayOnProvider(track)}
                      title="Play on streaming service"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
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

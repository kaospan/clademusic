import { useState } from 'react';
import { motion } from 'framer-motion';
import { BottomNav } from '@/components/BottomNav';
import { ChordBadge } from '@/components/ChordBadge';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  User,
  LogOut,
  Music,
  Link as LinkIcon,
  Sparkles,
  Heart,
  Bookmark,
  ChevronRight,
  Zap,
  Crown,
  Calendar,
  Filter,
  Check,
  Clock,
} from 'lucide-react';
import { usePlayHistory, usePlayStats } from '@/hooks/api/usePlayEvents';
import { useProfile, useUserProviders, useSetPreferredProvider } from '@/hooks/api/useProfile';
import { PROVIDER_INFO } from '@/lib/providers';
import { MusicProvider } from '@/types';
import { formatDistanceToNow } from 'date-fns';

// Mock taste DNA data
const tasteDNA = {
  favoriteProgressions: [
    { progression: ['vi', 'IV', 'I', 'V'], count: 42 },
    { progression: ['I', 'V', 'vi', 'IV'], count: 38 },
    { progression: ['i', 'VII', 'VI', 'VII'], count: 24 },
  ],
  preferredModes: [
    { mode: 'minor', percentage: 58 },
    { mode: 'major', percentage: 42 },
  ],
  energyPreference: 0.72,
  cadencePreference: 'loop',
};

export default function ProfilePage() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [providerFilter, setProviderFilter] = useState<MusicProvider | 'all'>('all');
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  
  // Fetch data
  const { data: profile } = useProfile();
  const { data: userProviders = [] } = useUserProviders();
  const { data: playStats } = usePlayStats();
  const { data: playHistory = [] } = usePlayHistory({
    limit: 20,
    provider: providerFilter === 'all' ? undefined : providerFilter,
  });
  const setPreferredProvider = useSetPreferredProvider();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSetPreferredProvider = async (provider: MusicProvider | 'none') => {
    try {
      await setPreferredProvider.mutateAsync(provider);
      setShowProviderSelector(false);
    } catch (error) {
      console.error('Failed to set preferred provider:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 glass-strong safe-top">
          <div className="px-4 py-4 max-w-lg mx-auto">
            <h1 className="text-xl font-bold">Profile</h1>
          </div>
        </header>

        <main className="px-4 py-8 max-w-lg mx-auto text-center space-y-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted/50">
            <User className="w-12 h-12 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold">Sign in to see your profile</h2>
            <p className="text-muted-foreground">
              Track your harmonic taste DNA and saved songs
            </p>
          </div>

          <Button
            onClick={() => navigate('/auth')}
            className="bg-primary hover:bg-primary/90"
          >
            Sign in
          </Button>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong safe-top">
        <div className="px-4 py-4 max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Profile</h1>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4 max-w-lg mx-auto space-y-6">
        {/* User info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 glass rounded-2xl"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {user.email?.[0].toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold truncate">{user.email?.split('@')[0]}</h2>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </div>
        </motion.div>

        {/* Credits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-4 glass rounded-2xl"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <span className="font-medium">Credits</span>
            </div>
            <span className="text-sm text-muted-foreground">Free tier</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-1/4 bg-gradient-to-r from-primary to-accent rounded-full" />
            </div>
            <span className="text-sm font-medium">25/100</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Credits reset monthly. Used for track analysis.
          </p>
        </motion.div>

        {/* Taste DNA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h3 className="font-bold">Your Taste DNA</h3>
          </div>

          {/* Favorite progressions */}
          <div className="p-4 glass rounded-2xl space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Favorite Progressions
            </h4>
            {tasteDNA.favoriteProgressions.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between"
              >
                <div className="flex gap-1">
                  {item.progression.map((chord, i) => (
                    <ChordBadge key={i} chord={chord} size="sm" />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {item.count} songs
                </span>
              </div>
            ))}
          </div>

          {/* Mode preference */}
          <div className="p-4 glass rounded-2xl space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Mode Preference
            </h4>
            <div className="flex gap-2">
              {tasteDNA.preferredModes.map((item) => (
                <div
                  key={item.mode}
                  className="flex-1 p-3 rounded-xl bg-muted/50 text-center"
                >
                  <span className="text-lg font-bold">{item.percentage}%</span>
                  <p className="text-xs text-muted-foreground capitalize">
                    {item.mode}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Energy level */}
          <div className="p-4 glass rounded-2xl space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Energy Preference
            </h4>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Low</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                  style={{ width: `${tasteDNA.energyPreference * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">High</span>
            </div>
          </div>
        </motion.div>

        {/* Connected providers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          <h3 className="font-bold flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Connected Services
          </h3>

          {/* Spotify */}
          <button 
            className="w-full p-4 glass rounded-2xl flex items-center justify-between hover:bg-muted/30 transition-colors"
            onClick={() => {/* TODO: Connect Spotify */}}
          >
            {(() => {
              const spotifyProvider = userProviders.find(p => p.provider === 'spotify');
              return (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1DB954]/20 flex items-center justify-center">
                      <Music className="w-5 h-5 text-[#1DB954]" />
                    </div>
                    <div className="text-left">
                      <span className="font-medium">Spotify</span>
                      <p className="text-xs text-muted-foreground">
                        {spotifyProvider 
                          ? `Connected ${formatDistanceToNow(new Date(spotifyProvider.connected_at))} ago`
                          : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {spotifyProvider && (
                      <Check className="w-4 h-4 text-[#1DB954]" />
                    )}
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </>
              );
            })()}
          </button>

          {/* YouTube Music */}
          <button 
            className="w-full p-4 glass rounded-2xl flex items-center justify-between hover:bg-muted/30 transition-colors"
            onClick={() => {/* TODO: Connect YouTube */}}
          >
            {(() => {
              const youtubeProvider = userProviders.find(p => p.provider === 'youtube');
              return (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FF0000]/20 flex items-center justify-center">
                      <Music className="w-5 h-5 text-[#FF0000]" />
                    </div>
                    <div className="text-left">
                      <span className="font-medium">YouTube Music</span>
                      <p className="text-xs text-muted-foreground">
                        {youtubeProvider 
                          ? `Connected ${formatDistanceToNow(new Date(youtubeProvider.connected_at))} ago`
                          : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {youtubeProvider && (
                      <Check className="w-4 h-4 text-[#FF0000]" />
                    )}
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </>
              );
            })()}
          </button>

          {/* Preferred Provider Selector */}
          {userProviders.length > 0 && (
            <div className="p-4 glass rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Preferred Provider
                </h4>
                <button
                  onClick={() => setShowProviderSelector(!showProviderSelector)}
                  className="text-xs text-primary hover:underline"
                >
                  Change
                </button>
              </div>
              
              {!showProviderSelector ? (
                <div className="flex items-center gap-2">
                  {profile?.preferred_provider && profile.preferred_provider !== 'none' ? (
                    <>
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${PROVIDER_INFO[profile.preferred_provider].color}20` }}
                      >
                        <span>{PROVIDER_INFO[profile.preferred_provider].icon}</span>
                      </div>
                      <span className="text-sm font-medium">
                        {PROVIDER_INFO[profile.preferred_provider].name}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">No preference set</span>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => handleSetPreferredProvider('none')}
                    className={`w-full p-2 rounded-lg text-left text-sm transition-colors ${
                      !profile?.preferred_provider || profile.preferred_provider === 'none'
                        ? 'bg-primary/20 text-primary'
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    No preference
                  </button>
                  {userProviders.map((up) => (
                    <button
                      key={up.id}
                      onClick={() => handleSetPreferredProvider(up.provider)}
                      className={`w-full p-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                        profile?.preferred_provider === up.provider
                          ? 'bg-primary/20 text-primary'
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center text-xs"
                        style={{ backgroundColor: `${PROVIDER_INFO[up.provider].color}20` }}
                      >
                        <span>{PROVIDER_INFO[up.provider].icon}</span>
                      </div>
                      {PROVIDER_INFO[up.provider].name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Play History Section */}
        {playHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Play History
              </h3>
              {playStats && (
                <span className="text-xs text-muted-foreground">
                  {playStats.totalPlays} total plays
                </span>
              )}
            </div>

            {/* Provider Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setProviderFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  providerFilter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                All
              </button>
              {Object.entries(PROVIDER_INFO).map(([key, info]) => {
                const hasProvider = userProviders.some(p => p.provider === key);
                if (!hasProvider) return null;
                
                return (
                  <button
                    key={key}
                    onClick={() => setProviderFilter(key as MusicProvider)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                      providerFilter === key
                        ? 'text-white'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                    style={providerFilter === key ? { backgroundColor: info.color } : {}}
                  >
                    <span>{info.icon}</span>
                    {info.name}
                  </button>
                );
              })}
            </div>

            {/* Play History List */}
            <div className="space-y-2">
              {playHistory.map((event) => {
                // Track info from event itself (no nested tracks in PlayEventData)
                if (!event.track_id) return null;

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 glass rounded-xl flex gap-3 hover:bg-muted/30 transition-colors"
                  >
                    {/* Artwork placeholder - track data not loaded */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted/50 flex-shrink-0">
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-6 h-6 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Track Info - showing track_id since full track data not loaded */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">Track</h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {event.track_id.slice(0, 8)}...
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {/* Provider Badge */}
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1"
                          style={{ 
                            backgroundColor: `${PROVIDER_INFO[event.provider].color}20`,
                            color: PROVIDER_INFO[event.provider].color 
                          }}
                        >
                          <span className="text-[10px]">{PROVIDER_INFO[event.provider].icon}</span>
                          {PROVIDER_INFO[event.provider].name}
                        </span>
                        {/* Timestamp */}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.played_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-2 gap-3"
        >
          <button className="p-4 glass rounded-2xl flex flex-col items-center gap-2 hover:bg-muted/30 transition-colors">
            <Heart className="w-6 h-6 text-accent" />
            <span className="text-sm font-medium">Liked</span>
            <span className="text-xs text-muted-foreground">0 songs</span>
          </button>

          <button className="p-4 glass rounded-2xl flex flex-col items-center gap-2 hover:bg-muted/30 transition-colors">
            <Bookmark className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium">Saved</span>
            <span className="text-xs text-muted-foreground">0 songs</span>
          </button>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}

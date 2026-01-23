import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChordBadge } from '@/components/ChordBadge';
import { SpotifyIcon } from '@/components/QuickStreamButtons';
import { PageLayout, EmptyState, LoadingSpinner } from '@/components/shared';
import { ResponsiveContainer, ResponsiveGrid } from '@/components/layout/ResponsiveLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { navigateToTrack } from '@/lib/navigation';
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
  Check,
  Clock,
  Loader2,
  Radio,
  TrendingUp,
  BarChart3,
  Disc3,
  X,
  Shield,
  Palette,
} from 'lucide-react';
import { usePlayHistory, usePlayStats } from '@/hooks/api/usePlayEvents';
import { useProfile, useUserProviders, useSetPreferredProvider } from '@/hooks/api/useProfile';
import { useUserInteractionStats } from '@/hooks/api/useFeed';
import { useConnectSpotify, useDisconnectSpotify } from '@/hooks/api/useSpotifyConnect';
import { 
  useSpotifyProfile, 
  useSpotifyTopTracks, 
  useSpotifyTopArtists,
  useSpotifyRecentlyPlayed,
  useMusicStats,
  useSpotifyRecommendations,
  useSpotifyConnected,
} from '@/hooks/api/useSpotifyUser';
import {
  useLastFmUsername,
  useLastFmStats,
  useConnectLastFm,
  useDisconnectLastFm,
} from '@/hooks/api/useLastFm';
import { useTasteDNA } from '@/hooks/api/useTasteDNA';
import { PROVIDER_INFO } from '@/lib/providers';
import { MusicProvider } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { fadeInUp } from '@/lib/animations';
import { formatRelativeTime } from '@/lib/formatters';
import { ProviderBadge } from '@/components/ui/ProviderBadge';
import { GlassCard } from '@/components/ui/GlassCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { ThemeEditor } from '@/components/ThemeEditor';
import { useUserTheme } from '@/hooks/api/useThemes';
import { useIsAdmin } from '@/hooks/api/useAdmin';
import type { TimeRange } from '@/services/spotifyUserService';

// Mood profile styling
const moodColors: Record<string, string> = {
  energetic: 'from-orange-500 to-red-500',
  chill: 'from-blue-400 to-cyan-400',
  melancholic: 'from-purple-500 to-indigo-600',
  upbeat: 'from-yellow-400 to-orange-400',
  balanced: 'from-green-400 to-emerald-500',
};

const moodEmojis: Record<string, string> = {
  energetic: '⚡',
  chill: '🌊',
  melancholic: '🌙',
  upbeat: '☀️',
  balanced: '🎯',
};

export default function ProfilePage() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [providerFilter, setProviderFilter] = useState<MusicProvider | 'all'>('all');
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [lastFmInput, setLastFmInput] = useState('');
  const [lastFmDialogOpen, setLastFmDialogOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('medium_term');
  const [themeEditorOpen, setThemeEditorOpen] = useState(false);
  
  // Profile data
  const { data: profile } = useProfile();
  const { data: userProviders = [], refetch: refetchProviders } = useUserProviders();
  const { data: playStats } = usePlayStats();
  const { data: interactionStats } = useUserInteractionStats(user?.id);
  const { data: playHistory = [] } = usePlayHistory({
    limit: 20,
    provider: providerFilter === 'all' ? undefined : providerFilter,
  });
  const setPreferredProvider = useSetPreferredProvider();
  
  // Spotify data
  const { data: isSpotifyConnected } = useSpotifyConnected();
  const { data: spotifyProfile } = useSpotifyProfile();
  const { data: topTracks = [] } = useSpotifyTopTracks(timeRange, 10);
  const { data: topArtists = [] } = useSpotifyTopArtists(timeRange, 10);
  const { data: recentlyPlayed } = useSpotifyRecentlyPlayed(20);
  const { data: musicStats } = useMusicStats();
  const { data: recommendations = [] } = useSpotifyRecommendations([], [], 10);
  const connectSpotify = useConnectSpotify();
  const disconnectSpotify = useDisconnectSpotify();
  
  // Last.fm data
  const { data: lastFmUsername } = useLastFmUsername();
  const { data: lastFmStats } = useLastFmStats();
  const connectLastFm = useConnectLastFm();
  const disconnectLastFm = useDisconnectLastFm();
  
  // Taste DNA - real user data
  const { data: tasteDNA, isLoading: isTasteDNALoading } = useTasteDNA();
  
  // Theme and admin
  const { data: userTheme } = useUserTheme(user?.id);
  const { data: isAdmin } = useIsAdmin();

  const spotifyConnected = isSpotifyConnected === true;
  const lastFmConnected = !!lastFmUsername;
  const likesCount = interactionStats?.likes ?? 0;
  const savesCount = interactionStats?.saves ?? 0;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleConnectSpotify = async () => {
    try {
      await connectSpotify.mutateAsync();
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect Spotify');
    }
  };

  const handleDisconnectSpotify = async () => {
    try {
      await disconnectSpotify.mutateAsync();
      toast.success('Spotify disconnected');
      refetchProviders();
    } catch (error) {
      toast.error('Failed to disconnect Spotify');
    }
  };

  const handleConnectLastFm = async () => {
    if (!lastFmInput.trim()) {
      toast.error('Please enter your Last.fm username');
      return;
    }
    try {
      await connectLastFm.mutateAsync(lastFmInput.trim());
      toast.success('Last.fm connected successfully!');
      setLastFmDialogOpen(false);
      setLastFmInput('');
      refetchProviders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to connect Last.fm');
    }
  };

  const handleDisconnectLastFm = async () => {
    try {
      await disconnectLastFm.mutateAsync();
      toast.success('Last.fm disconnected');
      refetchProviders();
    } catch (error) {
      toast.error('Failed to disconnect Last.fm');
    }
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
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    return (
      <PageLayout title="Profile">
        <EmptyState
          icon={User}
          title="Sign in to see your profile"
          description="Track your harmonic taste DNA and saved songs"
          actionLabel="Sign in"
          onAction={() => navigate('/auth')}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Profile"
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setThemeEditorOpen(true)}>
            <Palette className="w-4 h-4" />
            Theme
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
              <Shield className="w-4 h-4" />
              Admin
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      }
    >
      <ResponsiveContainer maxWidth="full" className="space-y-6">
      {/* User info - Enhanced with Spotify profile */}
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="flex items-center gap-4 p-4 glass rounded-2xl"
      >
          <Avatar className="w-16 h-16">
            <AvatarImage src={spotifyProfile?.imageUrl || profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xl">
              {spotifyProfile?.displayName?.[0] || user.email?.[0].toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold truncate">
              {spotifyProfile?.displayName || user.email?.split('@')[0]}
            </h2>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            {spotifyProfile && (
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  spotifyProfile.product === 'premium' 
                    ? 'bg-[#1DB954]/20 text-[#1DB954]' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {spotifyProfile.product === 'premium' ? '👑 Premium' : 'Free'}
                </span>
                {spotifyProfile.followers && spotifyProfile.followers > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {spotifyProfile.followers} followers
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Credits */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
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

        {/* Music DNA - From Spotify */}
        {spotifyConnected && musicStats && (
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <h3 className="font-bold">Your Music DNA</h3>
            </div>

            {/* Mood Profile Card */}
            <div className={`p-6 rounded-2xl bg-gradient-to-br ${moodColors[musicStats.moodProfile]} text-white`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{moodEmojis[musicStats.moodProfile]}</span>
                <div>
                  <h4 className="text-xl font-bold capitalize">{musicStats.moodProfile}</h4>
                  <p className="text-white/80 text-sm">Your listening mood profile</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/60 text-xs">Energy</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/20 rounded-full">
                      <div 
                        className="h-full bg-white rounded-full" 
                        style={{ width: `${musicStats.averageEnergy * 100}%` }}
                      />
                    </div>
                    <span className="text-sm">{Math.round(musicStats.averageEnergy * 100)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-white/60 text-xs">Danceability</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/20 rounded-full">
                      <div 
                        className="h-full bg-white rounded-full" 
                        style={{ width: `${musicStats.averageDanceability * 100}%` }}
                      />
                    </div>
                    <span className="text-sm">{Math.round(musicStats.averageDanceability * 100)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-white/60 text-xs">Happiness</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/20 rounded-full">
                      <div 
                        className="h-full bg-white rounded-full" 
                        style={{ width: `${musicStats.averageValence * 100}%` }}
                      />
                    </div>
                    <span className="text-sm">{Math.round(musicStats.averageValence * 100)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-white/60 text-xs">Avg Tempo</p>
                  <p className="text-lg font-bold">{Math.round(musicStats.averageTempo)} BPM</p>
                </div>
              </div>
            </div>

            {/* Top Genres */}
            {musicStats.topGenres.length > 0 && (
              <div className="p-4 glass rounded-2xl">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Top Genres</h4>
                <div className="flex flex-wrap gap-2">
                  {musicStats.topGenres.slice(0, 8).map((g, i) => (
                    <span 
                      key={g.genre} 
                      className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                      style={{ opacity: 1 - (i * 0.08) }}
                    >
                      {g.genre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Chord Taste DNA - Real user data or loading state */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.12 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h3 className="font-bold">Chord Taste DNA</h3>
            {tasteDNA?.totalTracksAnalyzed && (
              <span className="text-xs text-muted-foreground">
                ({tasteDNA.totalTracksAnalyzed} tracks analyzed)
              </span>
            )}
          </div>

          {isTasteDNALoading && (
            <div className="p-8 glass rounded-2xl text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Analyzing your musical taste...
              </p>
            </div>
          )}

          {!isTasteDNALoading && !tasteDNA && (
            <div className="p-8 glass rounded-2xl text-center">
              <Music className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Start listening to tracks to build your taste profile
              </p>
            </div>
          )}

          {!isTasteDNALoading && tasteDNA && (
            <>
              {/* Favorite progressions */}
              {tasteDNA.favoriteProgressions.length > 0 ? (
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
                        {item.count} {item.count === 1 ? 'song' : 'songs'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 glass rounded-2xl text-center text-sm text-muted-foreground">
                  No chord progressions detected yet
                </div>
              )}

              {/* Mode preference */}
              {tasteDNA.preferredModes.length > 0 && (
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
                        <p className="text-xs text-muted-foreground/60">
                          {item.count} tracks
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Energy level */}
              <div className="p-4 glass rounded-2xl space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Energy Preference
                </h4>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Low</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                      style={{ width: `${tasteDNA.energyPreference * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">High</span>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {Math.round(tasteDNA.energyPreference * 100)}% energy • {tasteDNA.averageTempo} BPM avg
                </p>
              </div>

              {/* Cadence preference */}
              {tasteDNA.cadencePreference && (
                <div className="p-4 glass rounded-2xl">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Cadence Style
                  </h4>
                  <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm capitalize">
                    {tasteDNA.cadencePreference}
                  </span>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Connected providers */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          <h3 className="font-bold flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Connected Services
          </h3>

          {/* Spotify */}
          {(() => {
            const spotifyProvider = userProviders.find(p => p.provider === 'spotify');
            const isConnecting = connectSpotify.isPending;
            const isDisconnecting = disconnectSpotify.isPending;
            
            return (
              <div className="w-full p-4 glass rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1DB954]/20 flex items-center justify-center">
                      <SpotifyIcon className="w-5 h-5 text-[#1DB954]" />
                    </div>
                    <div className="text-left">
                      <span className="font-medium">Spotify</span>
                      <p className="text-xs text-muted-foreground">
                        {spotifyProvider 
                          ? `Connected ${formatDistanceToNow(new Date(spotifyProvider.connected_at))} ago`
                          : 'Sync your listening history'}
                      </p>
                    </div>
                  </div>
                  
                  {spotifyProvider ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnectSpotify}
                      disabled={isDisconnecting}
                      className="text-destructive hover:text-destructive"
                    >
                      {isDisconnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Disconnect'
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleConnectSpotify}
                      disabled={isConnecting}
                      className="bg-[#1DB954] hover:bg-[#1ed760] text-white gap-2"
                    >
                      {isConnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <SpotifyIcon className="w-4 h-4" />
                          Connect
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                {spotifyProvider && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-[#1DB954]">
                    <Check className="w-3 h-3" />
                    <span>Syncing your recently played tracks</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* YouTube Music */}
          <button 
            className="w-full p-4 glass rounded-2xl flex items-center justify-between hover:bg-muted/30 transition-colors"
            onClick={() => {
              // TODO: Connect YouTube
              // Implement YouTube OAuth flow similar to Spotify
              // Scopes: https://www.googleapis.com/auth/youtube.readonly
              // Store tokens in user_providers table with provider='youtube'
              // See TASKS.md for implementation steps
            }}
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
                          : 'Coming soon'}
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

          {/* Last.fm */}
          <div className="w-full p-4 glass rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D51007]/20 flex items-center justify-center">
                  <Radio className="w-5 h-5 text-[#D51007]" />
                </div>
                <div className="text-left">
                  <span className="font-medium">Last.fm</span>
                  <p className="text-xs text-muted-foreground">
                    {lastFmConnected ? (
                      <>@{lastFmUsername} • {lastFmStats?.totalScrobbles.toLocaleString()} scrobbles</>
                    ) : (
                      'Connect to see your listening history'
                    )}
                  </p>
                </div>
              </div>
              {lastFmConnected ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDisconnectLastFm}
                  disabled={disconnectLastFm.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  {disconnectLastFm.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-1" />
                      Disconnect
                    </>
                  )}
                </Button>
              ) : (
                <Dialog open={lastFmDialogOpen} onOpenChange={setLastFmDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-[#D51007] hover:bg-[#D51007]/90">
                      Connect
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Connect Last.fm</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <p className="text-sm text-muted-foreground">
                        Enter your Last.fm username to sync your listening history and scrobbles.
                      </p>
                      <Input
                        placeholder="Your Last.fm username"
                        value={lastFmInput}
                        onChange={(e) => setLastFmInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleConnectLastFm()}
                      />
                      <Button 
                        onClick={handleConnectLastFm} 
                        disabled={connectLastFm.isPending}
                        className="w-full bg-[#D51007] hover:bg-[#D51007]/90"
                      >
                        {connectLastFm.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        {connectLastFm.isPending ? 'Connecting...' : 'Connect Last.fm'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {lastFmConnected && (
              <div className="flex items-center gap-2 mt-2 text-xs text-[#D51007]">
                <Check className="w-3 h-3" />
                <span>Syncing your scrobble history</span>
              </div>
            )}
          </div>

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

        {/* Spotify Top Tracks / Artists / Recent - Tabs */}
        {spotifyConnected && (
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.17 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Your Music
              </h3>
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="text-xs bg-muted/50 border-none rounded-lg px-2 py-1"
              >
                <option value="short_term">Last 4 weeks</option>
                <option value="medium_term">Last 6 months</option>
                <option value="long_term">All time</option>
              </select>
            </div>

            <Tabs defaultValue="tracks" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tracks">Top Tracks</TabsTrigger>
                <TabsTrigger value="artists">Top Artists</TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
              </TabsList>

              <TabsContent value="tracks" className="mt-4">
                <ResponsiveGrid cols={{ sm: 1, md: 2, lg: 3 }} gap="sm">
                {topTracks.map((track, i) => (
                  <div key={track.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                    <span className="w-6 text-center text-muted-foreground text-sm">{i + 1}</span>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted">
                      {track.cover_url ? (
                        <img src={track.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                  </div>
                ))}
                </ResponsiveGrid>
                {topTracks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No top tracks yet. Connect Spotify to see your music!</p>
                )}
              </TabsContent>

              <TabsContent value="artists" className="mt-4">
                <ResponsiveGrid cols={{ sm: 1, md: 2, lg: 3 }} gap="sm">
                {topArtists.map((artist, i) => (
                  <div key={artist.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                    <span className="w-6 text-center text-muted-foreground text-sm">{i + 1}</span>
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                      {artist.images?.[0]?.url ? (
                        <img src={artist.images[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{artist.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {artist.genres?.slice(0, 2).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
                </ResponsiveGrid>
                {topArtists.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No top artists yet. Start listening!</p>
                )}
              </TabsContent>

              <TabsContent value="recent" className="mt-4">
                <ResponsiveGrid cols={{ sm: 1, md: 2, lg: 3 }} gap="sm">
                {recentlyPlayed?.tracks?.map((track) => (
                  <div key={track.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted">
                      {track.cover_url ? (
                        <img src={track.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>
                  </div>
                ))}
                </ResponsiveGrid>
                {(!recentlyPlayed?.tracks || recentlyPlayed.tracks.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">No recent plays. Start listening now!</p>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        )}

        {/* Recommendations */}
        {spotifyConnected && recommendations.length > 0 && (
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.19 }}
            className="space-y-4"
          >
            <h3 className="font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Recommended For You
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {recommendations.slice(0, 10).map((track) => (
                <div key={track.id} className="p-2 glass rounded-xl hover:bg-muted/30 transition-colors group cursor-pointer">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                    {track.cover_url ? (
                      <img src={track.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Disc3 className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="font-medium text-xs truncate">{track.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Last.fm Stats */}
        {lastFmConnected && lastFmStats && (
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.21 }}
            className="space-y-4"
          >
            <h3 className="font-bold flex items-center gap-2">
              <Radio className="w-5 h-5 text-[#D51007]" />
              Last.fm Stats
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 glass rounded-2xl text-center">
                <p className="text-2xl font-bold">{lastFmStats.totalScrobbles.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Scrobbles</p>
              </div>
              <div className="p-4 glass rounded-2xl text-center">
                <p className="text-2xl font-bold">{lastFmStats.weeklyArtistCount}</p>
                <p className="text-xs text-muted-foreground">Artists This Week</p>
              </div>
              <div className="p-4 glass rounded-2xl text-center">
                <p className="text-2xl font-bold">{lastFmStats.topArtists.length}</p>
                <p className="text-xs text-muted-foreground">Top Artists</p>
              </div>
            </div>

            {/* Last.fm Top Artists */}
            {lastFmStats.topArtists.length > 0 && (
              <div className="p-4 glass rounded-2xl">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Top Artists (3 months)</h4>
                <div className="space-y-2">
                  {lastFmStats.topArtists.slice(0, 5).map((artist, i) => (
                    <div key={artist.name} className="flex items-center gap-3">
                      <span className="w-5 text-muted-foreground text-sm">{i + 1}</span>
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-muted">
                        {artist.imageUrl ? (
                          <img src={artist.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="flex-1 text-sm truncate">{artist.name}</span>
                      <span className="text-xs text-muted-foreground">{artist.playcount} plays</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Play History Section */}
        {playHistory.length > 0 && (
          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
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
                if (!event.track_id) return null;
                
                // Parse track info from track_id (format: seed-1, spotify:track:xxx, etc.)
                const trackTitle = event.track_id.includes('seed-') 
                  ? 'Sample Track' 
                  : event.track_id.split(':').pop()?.slice(0, 12) || 'Unknown Track';

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 glass rounded-xl flex gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigateToTrack(navigate, event.track_id)}
                  >
                    {/* Artwork */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted/50 flex-shrink-0">
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-6 h-6 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{trackTitle}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <ProviderBadge provider={event.provider as MusicProvider} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(event.played_at)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Quick links */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.25 }}
          className="grid grid-cols-2 gap-3"
        >
          <button className="p-4 glass rounded-2xl flex flex-col items-center gap-2 hover:bg-muted/30 transition-colors">
            <Heart className="w-6 h-6 text-accent" />
            <span className="text-sm font-medium">Liked</span>
            <span className="text-xs text-muted-foreground">{likesCount} songs</span>
          </button>

          <button className="p-4 glass rounded-2xl flex flex-col items-center gap-2 hover:bg-muted/30 transition-colors">
            <Bookmark className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium">Saved</span>
            <span className="text-xs text-muted-foreground">{savesCount} songs</span>
          </button>
        </motion.div>
      </ResponsiveContainer>

      {/* Theme Editor Modal */}
      <ThemeEditor
        open={themeEditorOpen}
        onOpenChange={setThemeEditorOpen}
        currentTheme={userTheme}
        userId={user?.id || ''}
      />
    </PageLayout>
  );
}

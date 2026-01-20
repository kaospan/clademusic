import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Music, Play, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AudioPreview } from '@/components/AudioPreview';
import { StreamingLinks } from '@/components/StreamingLinks';
import { PageLayout, EmptyState, LoadingSpinner, CardSkeleton } from '@/components/shared';
import { useAuth } from '@/hooks/useAuth';
import { useFollowingFeed, useFollowing, useRecordPlay } from '@/hooks/api/useFollowing';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fadeInUp } from '@/lib/animations';

export default function FollowingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: feed, isLoading: feedLoading } = useFollowingFeed();
  const { data: following, isLoading: followingLoading } = useFollowing();
  const recordPlay = useRecordPlay();
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);

  if (authLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) {
    return (
      <PageLayout title="Following" fixedHeader>
        <EmptyState
          icon={Users}
          title="Sign in to see what people are listening to"
          description="Follow other music lovers and discover new tracks through their listening activity."
          actionLabel="Sign in"
          actionIcon={User}
          onAction={() => navigate('/auth')}
        />
      </PageLayout>
    );
  }

  const isLoading = feedLoading || followingLoading;

  return (
    <PageLayout
      fixedHeader
      headerContent={
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold gradient-text">Following</h1>
          <span className="text-sm text-muted-foreground">
            {following?.length || 0} following
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4 pt-4">
            <CardSkeleton count={5} />
          </div>
        ) : !feed || feed.length === 0 ? (
          <EmptyState
            icon={Music}
            title="No activity yet"
            description={
              following && following.length > 0
                ? "The people you follow haven't played any tracks recently."
                : "Follow some music lovers to see what they're listening to!"
            }
            actionLabel={(!following || following.length === 0) ? "Find people to follow" : undefined}
            actionIcon={Users}
            onAction={(!following || following.length === 0) ? () => navigate('/search') : undefined}
          />
        ) : (
          <AnimatePresence>
            {feed.map((item, index) => (
              <motion.div
                key={item.id}
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                transition={{ delay: index * 0.05 }}
                className="rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 overflow-hidden"
              >
                  {/* User info header */}
                  <div className="flex items-center gap-3 p-4 border-b border-border/30">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={item.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {item.profile?.display_name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {item.profile?.display_name || 'Anonymous'}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(item.played_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Play className="w-3 h-3" />
                      <span>Played</span>
                    </div>
                  </div>

                  {/* Track card */}
                  {item.track && (
                    <div
                      className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedTrack(expandedTrack === item.id ? null : item.id)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Cover art */}
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                          {item.track.cover_url ? (
                            <img
                              src={item.track.cover_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Track info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{item.track.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{item.track.artist}</p>
                          {item.track.album && (
                            <p className="text-xs text-muted-foreground/70 truncate">{item.track.album}</p>
                          )}
                        </div>

                        {/* Quick play indicator */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            recordPlay.mutate({ trackId: item.track_id, source: 'following-feed' });
                          }}
                        >
                          <Play className="w-5 h-5" />
                        </Button>
                      </div>

                      {/* Expanded content */}
                      <AnimatePresence>
                        {expandedTrack === item.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 space-y-4 border-t border-border/30 mt-4">
                              {/* Audio preview */}
                              {item.track.preview_url && (
                                <AudioPreview
                                  previewUrl={item.track.preview_url}
                                  title={item.track.title}
                                  artist={item.track.artist}
                                  coverUrl={item.track.cover_url}
                                  compact
                                />
                              )}

                              {/* Streaming links */}
                              <StreamingLinks
                                track={{
                                  spotifyId: item.track.spotify_id || undefined,
                                  youtubeId: item.track.youtube_id || undefined,
                                }}
                                compact
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
    </PageLayout>
  );
}

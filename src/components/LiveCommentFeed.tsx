/**
 * Live Comment Feed Component
 * 
 * Shows a scrollable list of comments with a pinned "top liked" comment
 * fixed at the bottom of the screen. Supports real-time updates.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Send, Pin, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Comment } from '@/types';

interface LiveCommentFeedProps {
  entityId: string; // track_id, album_id, or artist_id
  entityType: 'track' | 'album' | 'artist';
  entityTitle: string;
  className?: string;
}

// Mock data for demonstration
const mockComments: Comment[] = [
  {
    id: '1',
    user_id: 'u1',
    content: 'This beat is absolutely fire! The way it samples the original is genius 🔥',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    likes_count: 42,
    user: { display_name: 'MusicLover99', avatar_url: undefined },
  },
  {
    id: '2',
    user_id: 'u2',
    content: 'The bassline in this is so smooth. Instant classic.',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    likes_count: 128,
    user: { display_name: 'BeatHead', avatar_url: undefined },
    is_pinned: true,
  },
  {
    id: '3',
    user_id: 'u3',
    content: 'Just found this through the sample connection. Amazing discovery!',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    likes_count: 15,
    user: { display_name: 'SampleHunter', avatar_url: undefined },
  },
  {
    id: '4',
    user_id: 'u4',
    content: 'This takes me back to summer 2024. Perfect vibes.',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    likes_count: 8,
    user: { display_name: 'VibeMaster', avatar_url: undefined },
  },
  {
    id: '5',
    user_id: 'u5',
    content: 'Anyone else hear the jazz influence in the chord progression?',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likes_count: 23,
    user: { display_name: 'JazzHead', avatar_url: undefined },
  },
];

export function LiveCommentFeed({ 
  entityId, 
  entityType, 
  entityTitle,
  className 
}: LiveCommentFeedProps) {
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [newComment, setNewComment] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Find the most liked comment to pin
  const pinnedComment = comments.reduce((max, c) => 
    c.likes_count > (max?.likes_count ?? 0) ? c : max
  , comments[0]);

  // Sort remaining comments by date (newest first)
  const sortedComments = comments
    .filter(c => c.id !== pinnedComment?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    // Add optimistic comment
    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      user_id: user.id,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      likes_count: 0,
      user: { display_name: user.email?.split('@')[0] },
    };

    setComments(prev => [optimisticComment, ...prev]);
    setNewComment('');
  };

  const handleLike = (commentId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setComments(prev => prev.map(c => 
      c.id === commentId 
        ? { ...c, likes_count: c.user_liked ? c.likes_count - 1 : c.likes_count + 1, user_liked: !c.user_liked }
        : c
    ));
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 bg-muted/30 rounded-t-xl cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <span className="font-medium">Live Comments</span>
          <span className="text-xs text-muted-foreground">({comments.length})</span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* Comment list */}
            <ScrollArea className="h-64 p-3 bg-background/50 rounded-b-xl" ref={scrollRef}>
              <div className="space-y-3">
                {sortedComments.map((comment, index) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={comment.user?.avatar_url} />
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {comment.user?.display_name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {comment.user?.display_name || 'Anonymous'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 mt-0.5">{comment.content}</p>
                      <button
                        onClick={() => handleLike(comment.id)}
                        className={cn(
                          'flex items-center gap-1 mt-1 text-xs transition-colors',
                          comment.user_liked ? 'text-accent' : 'text-muted-foreground hover:text-accent'
                        )}
                      >
                        <Heart className={cn('w-3.5 h-3.5', comment.user_liked && 'fill-current')} />
                        {comment.likes_count}
                      </button>
                    </div>
                  </motion.div>
                ))}

                {sortedComments.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Be the first to comment!
                  </p>
                )}
              </div>
            </ScrollArea>

            {/* Comment input */}
            <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-border">
              <Input
                placeholder={user ? "Add a comment..." : "Sign in to comment"}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={!user}
                className="flex-1"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!newComment.trim() || !user}
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned "Most Liked" comment - always visible at bottom */}
      {pinnedComment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-20 left-4 right-4 lg:left-auto lg:right-8 lg:w-96 z-40"
        >
          <div className="glass rounded-xl p-3 shadow-lg border border-accent/30">
            <div className="flex items-center gap-2 mb-2">
              <Pin className="w-4 h-4 text-accent" />
              <span className="text-xs font-medium text-accent">Most Liked Comment</span>
            </div>
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={pinnedComment.user?.avatar_url} />
                <AvatarFallback className="text-xs bg-accent/20 text-accent">
                  {pinnedComment.user?.display_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {pinnedComment.user?.display_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(pinnedComment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 mt-0.5 line-clamp-2">
                  {pinnedComment.content}
                </p>
                <div className="flex items-center gap-1 mt-1 text-xs text-accent">
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  {pinnedComment.likes_count}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

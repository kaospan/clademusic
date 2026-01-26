import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Heart, Reply, Edit2, Trash2, MoreVertical, UserPlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface TrackComment {
  id: string;
  track_id: string;
  user_id: string;
  comment: string;
  reply_to?: string | null;
  likes_count: number;
  created_at: string;
  updated_at: string;
  edited_at?: string | null;
  user_display_name?: string;
  user_avatar_url?: string;
  user_liked: boolean;
}

interface TrackCommentsProps {
  trackId: string;
  className?: string;
}

export function TrackComments({ trackId, className = '' }: TrackCommentsProps) {
  const { user, guestMode } = useAuth();
  const navigate = useNavigate();
  const supabaseDisabled = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
  const [comments, setComments] = useState<TrackComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<TrackComment | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replies, setReplies] = useState<Record<string, TrackComment[]>>({});
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (supabaseDisabled) {
      setIsLoading(false);
      return;
    }

    if (trackId) {
      loadComments();
      subscribeToComments();
    }
  }, [trackId, supabaseDisabled]);

  const loadComments = async () => {
    if (supabaseDisabled) {
      setComments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_track_comments', {
        p_track_id: trackId,
        p_limit: 50,
        p_offset: 0,
      });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReplies = async (commentId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_comment_replies', {
        p_comment_id: commentId,
      });

      if (error) throw error;
      setReplies((prev) => ({ ...prev, [commentId]: data || [] }));
      setShowReplies((prev) => ({ ...prev, [commentId]: true }));
    } catch (error) {
      console.error('Error loading replies:', error);
    }
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`track-comments:${trackId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'track_comments',
          filter: `track_id=eq.${trackId}`,
        },
        () => {
          loadComments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'track_comments',
          filter: `track_id=eq.${trackId}`,
        },
        () => {
          loadComments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'track_comments',
          filter: `track_id=eq.${trackId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || isPosting) return;

    setIsPosting(true);
    try {
      const { error } = await supabase.from('track_comments').insert({
        track_id: trackId,
        user_id: user.id,
        comment: newComment.trim(),
        reply_to: replyingTo?.id || null,
      });

      if (error) throw error;

      setNewComment('');
      setReplyingTo(null);
      
      // Reload comments or replies depending on context
      if (replyingTo) {
        await loadReplies(replyingTo.id);
      } else {
        await loadComments();
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const toggleLike = async (commentId: string, currentlyLiked: boolean) => {
    if (!user) return;

    try {
      if (currentlyLiked) {
        // Unlike
        await supabase
          .from('track_comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        // Like
        await supabase.from('track_comment_likes').insert({
          comment_id: commentId,
          user_id: user.id,
        });
      }

      // Refresh comments to get updated like counts
      await loadComments();
      
      // Refresh replies if any are visible
      Object.keys(showReplies).forEach((id) => {
        if (showReplies[id]) {
          loadReplies(id);
        }
      });
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const editComment = async (commentId: string) => {
    if (!editText.trim()) return;

    try {
      const { error } = await supabase
        .from('track_comments')
        .update({
          comment: editText.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      if (error) throw error;

      setEditingComment(null);
      setEditText('');
      await loadComments();
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      const { error } = await supabase
        .from('track_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      await loadComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const renderComment = (comment: TrackComment, isReply = false) => (
    <motion.div
      key={comment.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('space-y-2', isReply && 'ml-12')}
    >
      <div className="flex gap-3">
        <Avatar className="w-10 h-10 flex-shrink-0">
          {comment.user_avatar_url ? (
            <img src={comment.user_avatar_url} alt="" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
              {comment.user_display_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {comment.user_display_name || 'Anonymous'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {comment.edited_at && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>

          {editingComment === comment.id ? (
            <div className="space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[60px]"
                maxLength={2000}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => editComment(comment.id)}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingComment(null);
                    setEditText('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm break-words whitespace-pre-wrap">{comment.comment}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 gap-1.5 text-xs',
                comment.user_liked && 'text-red-500 hover:text-red-600'
              )}
              onClick={() => toggleLike(comment.id, comment.user_liked)}
            >
              <Heart className={cn('w-4 h-4', comment.user_liked && 'fill-current')} />
              {comment.likes_count > 0 && comment.likes_count}
            </Button>

            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setReplyingTo(comment)}
              >
                <Reply className="w-4 h-4" />
                Reply
              </Button>
            )}

            {user?.id === comment.user_id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingComment(comment.id);
                      setEditText(comment.comment);
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => deleteComment(comment.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Show replies button */}
          {!isReply && !showReplies[comment.id] && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs mt-2"
              onClick={() => loadReplies(comment.id)}
            >
              View replies
            </Button>
          )}
        </div>
      </div>

      {/* Replies */}
      <AnimatePresence>
        {showReplies[comment.id] && replies[comment.id] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-3 mt-3"
          >
            {replies[comment.id].map((reply) => renderComment(reply, true))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Comments</h3>
        <Badge variant="secondary">{comments.length}</Badge>
      </div>

      {/* Post comment */}
      {user ? (
        <form onSubmit={postComment} className="space-y-3">
          {replyingTo && (
            <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                <Reply className="w-3 h-3 inline mr-1" />
                Replying to {replyingTo.user_display_name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
              >
                Cancel
              </Button>
            </div>
          )}
          <Textarea
            placeholder="Share your thoughts about this track..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={2000}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {newComment.length}/2000
            </span>
            <Button type="submit" disabled={!newComment.trim() || isPosting}>
              <Send className="w-4 h-4 mr-2" />
              {isPosting ? 'Posting...' : replyingTo ? 'Reply' : 'Post Comment'}
            </Button>
          </div>
        </form>
      ) : (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative overflow-hidden rounded-xl border-2 border-dashed border-border/50 bg-gradient-to-br from-background via-background to-muted/20 p-8 text-center"
        >
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#00F5FF]/5 via-[#FF00FF]/5 to-[#00F5FF]/5 animate-pulse" />
          
          {/* Content */}
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#00F5FF] to-[#FF00FF] mb-4">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            
            <h4 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
              Join the Conversation
              <Sparkles className="w-4 h-4 text-[#FF00FF]" />
            </h4>
            
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Sign up to share your thoughts, reply to others, and connect with music lovers who get it
            </p>
            
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-gradient-to-r from-[#00F5FF] to-[#FF00FF] hover:opacity-90 transition-opacity shadow-lg shadow-[#00F5FF]/20"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Sign Up to Comment
            </Button>
            
            <p className="text-xs text-muted-foreground mt-4">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/auth')}
                className="text-[#00F5FF] hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          </div>
        </motion.div>
      )}

      {/* Comments list */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              No comments yet. Be the first to share your thoughts!
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {comments.map((comment) => renderComment(comment))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

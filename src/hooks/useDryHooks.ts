import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

/**
 * DRY HOOK: useVote
 * Reusable voting logic for both posts and comments
 * Handles optimistic updates, error rollback, rate limiting
 */

export type VoteType = 'up' | 'down' | null;

interface UseVoteProps {
  itemId: string | null;
  itemType: 'post' | 'comment';
  initialVoteCount?: number;
  initialUserVote?: VoteType;
}

export function useVote({
  itemId,
  itemType,
  initialVoteCount = 0,
  initialUserVote = null,
}: UseVoteProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [userVote, setUserVote] = useState<VoteType>(initialUserVote);
  const [loading, setLoading] = useState(false);

  // Fetch current vote state
  const fetchVoteState = useCallback(async () => {
    if (!user || !itemId) return;

    try {
      const tableName = itemType === 'post' ? 'forum_posts' : 'forum_comments';
      const { data: itemData, error: itemError } = await supabase
        .from(tableName)
        .select('vote_count')
        .eq('id', itemId)
        .single();

      if (itemError) throw itemError;

      const { data: voteData, error: voteError } = await supabase
        .from('forum_votes')
        .select('vote_type')
        .eq(itemType === 'post' ? 'post_id' : 'comment_id', itemId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (voteError) throw voteError;

      setVoteCount(itemData?.vote_count || 0);
      setUserVote(voteData?.vote_type as VoteType || null);
    } catch (error) {
      console.error('Error fetching vote state:', error);
    }
  }, [user, itemId, itemType]);

  useEffect(() => {
    fetchVoteState();
  }, [fetchVoteState]);

  // Calculate new vote count based on vote change
  const calculateNewCount = useCallback(
    (oldVote: VoteType, newVote: VoteType): number => {
      let delta = 0;
      
      // Removing vote
      if (newVote === null) {
        delta = oldVote === 'up' ? -1 : 1;
      }
      // Adding or changing vote
      else if (oldVote === null) {
        delta = newVote === 'up' ? 1 : -1;
      }
      // Switching vote
      else if (oldVote !== newVote) {
        delta = newVote === 'up' ? 2 : -2;
      }
      
      return voteCount + delta;
    },
    [voteCount]
  );

  // Vote function (DRY implementation)
  const vote = useCallback(
    async (direction: 'up' | 'down') => {
      if (!user || !itemId) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to vote',
          variant: 'destructive',
        });
        return;
      }

      if (loading) return;

      // Determine new vote (toggle if same direction)
      const newVote: VoteType = userVote === direction ? null : direction;

      // Optimistic update
      const previousVote = userVote;
      const previousCount = voteCount;
      
      setUserVote(newVote);
      setVoteCount(calculateNewCount(userVote, newVote));
      setLoading(true);

      try {
        if (newVote === null) {
          // Remove vote
          const { error } = await supabase
            .from('forum_votes')
            .delete()
            .eq(itemType === 'post' ? 'post_id' : 'comment_id', itemId)
            .eq('user_id', user.id);

          if (error) throw error;
        } else {
          // Upsert vote
          const voteData: any = {
            user_id: user.id,
            vote_type: newVote,
          };

          if (itemType === 'post') {
            voteData.post_id = itemId;
          } else {
            voteData.comment_id = itemId;
          }

          const { error } = await supabase
            .from('forum_votes')
            .upsert(voteData);

          if (error) throw error;
        }

        // Fetch updated count from server to ensure consistency
        await fetchVoteState();
      } catch (error: any) {
        // Rollback on error
        setUserVote(previousVote);
        setVoteCount(previousCount);

        console.error('Error voting:', error);

        // Check for rate limit
        if (error.message?.includes('rate limit')) {
          toast({
            title: 'Rate limit exceeded',
            description: 'Please wait before voting again',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Vote failed',
            description: 'Please try again',
            variant: 'destructive',
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [user, itemId, itemType, userVote, voteCount, loading, calculateNewCount, fetchVoteState, toast]
  );

  return {
    voteCount,
    userVote,
    vote,
    loading,
    refetch: fetchVoteState,
  };
}

/**
 * DRY HOOK: useComments
 * Reusable comment fetching and posting logic
 * Works for both track comments and forum comments
 */

interface UseCommentsProps {
  itemId: string | null;
  itemType: 'track' | 'post';
  limit?: number;
}

export function useComments({
  itemId,
  itemType,
  limit = 50,
}: UseCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!itemId) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from(itemType === 'track' ? 'track_comments' : 'forum_comments')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (itemType === 'track') {
        query = query.eq('track_id', itemId);
      } else {
        query = query.eq('post_id', itemId).is('parent_comment_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error loading comments',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [itemId, itemType, limit, toast]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Real-time subscription
  useEffect(() => {
    if (!itemId) return;

    const tableName = itemType === 'track' ? 'track_comments' : 'forum_comments';
    const filterColumn = itemType === 'track' ? 'track_id' : 'post_id';

    const subscription = supabase
      .channel(`comments:${itemType}:${itemId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
          filter: `${filterColumn}=eq.${itemId}`,
        },
        (payload) => {
          // Fetch full comment with profile data
          supabase
            .from(tableName)
            .select(`
              *,
              profiles:user_id (
                id,
                username,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single()
            .then(({ data }) => {
              if (data) {
                setComments((prev) => [data, ...prev]);
              }
            });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [itemId, itemType]);

  // Post comment
  const postComment = useCallback(
    async (content: string, parentId?: string) => {
      if (!user || !itemId) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to comment',
          variant: 'destructive',
        });
        return false;
      }

      if (!content.trim()) {
        toast({
          title: 'Empty comment',
          description: 'Please enter a comment',
          variant: 'destructive',
        });
        return false;
      }

      setPosting(true);

      try {
        const commentData: any = {
          user_id: user.id,
          content: content.trim(),
        };

        if (itemType === 'track') {
          commentData.track_id = itemId;
        } else {
          commentData.post_id = itemId;
          if (parentId) {
            commentData.parent_comment_id = parentId;
          }
        }

        const { error } = await supabase
          .from(itemType === 'track' ? 'track_comments' : 'forum_comments')
          .insert(commentData);

        if (error) throw error;

        toast({
          title: 'Comment posted',
          description: 'Your comment has been added',
        });

        return true;
      } catch (error: any) {
        console.error('Error posting comment:', error);

        if (error.message?.includes('rate limit')) {
          toast({
            title: 'Rate limit exceeded',
            description: 'Please wait before commenting again',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Failed to post comment',
            description: 'Please try again',
            variant: 'destructive',
          });
        }

        return false;
      } finally {
        setPosting(false);
      }
    },
    [user, itemId, itemType, toast]
  );

  return {
    comments,
    loading,
    posting,
    postComment,
    refetch: fetchComments,
  };
}

/**
 * DRY HOOK: useQuery
 * Wrapper for Supabase queries with loading, error handling, and retry logic
 */

interface UseQueryOptions<T> {
  queryFn: () => Promise<{ data: T | null; error: any }>;
  enabled?: boolean;
  refetchInterval?: number;
  retryCount?: number;
  retryDelay?: number;
}

export function useQuery<T>({
  queryFn,
  enabled = true,
  refetchInterval,
  retryCount = 3,
  retryDelay = 1000,
}: UseQueryOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [retries, setRetries] = useState(0);

  const executeQuery = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      const result = await queryFn();

      if (result.error) {
        throw new Error(result.error.message || 'Query failed');
      }

      setData(result.data);
      setError(null);
      setRetries(0);
    } catch (err: any) {
      console.error('Query error:', err);
      setError(err);

      // Retry logic
      if (retries < retryCount) {
        setTimeout(() => {
          setRetries((prev) => prev + 1);
          executeQuery();
        }, retryDelay * Math.pow(2, retries)); // Exponential backoff
      }
    } finally {
      setLoading(false);
    }
  }, [queryFn, enabled, retries, retryCount, retryDelay]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  // Auto-refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(() => {
      executeQuery();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, enabled, executeQuery]);

  return {
    data,
    error,
    loading,
    refetch: executeQuery,
  };
}

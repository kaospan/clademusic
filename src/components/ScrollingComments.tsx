import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface Comment {
  id: string;
  content: string;
  author: string;
  created_at: string;
}

interface ScrollingCommentsProps {
  trackId?: string;
  roomId?: string;
  maxVisible?: number;
  scrollSpeed?: number;
}

/**
 * TikTok-style scrolling comments that appear from bottom and fade out
 * Shows real-time comments overlaid on the content
 */
let chatSchemaMissing = false;

export function ScrollingComments({
  trackId,
  roomId = 'global',
  maxVisible = 5,
  scrollSpeed = 5000,
}: ScrollingCommentsProps) {
  const chatDisabled = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
  const [comments, setComments] = useState<Comment[]>([]);
  const [visibleComments, setVisibleComments] = useState<Comment[]>([]);

  if (chatDisabled) {
    return null;
  }

  if (!trackId && chatSchemaMissing) {
    return null;
  }

  // Subscribe to real-time comments
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      let disableRealtime = false;
      let effectiveRoomId = roomId;

      // Resolve the UUID room id for "global" (migrations create a UUID id, not the literal string "global").
      if (!trackId && roomId === 'global') {
        try {
          const { data: globalRoom, error } = await supabase
            .from('chat_rooms')
            .select('id')
            .eq('type', 'global')
            .limit(1)
            .maybeSingle();

          if (error) throw error;
          if (!globalRoom?.id) {
            throw new Error('Global chat room not found');
          }
          effectiveRoomId = globalRoom.id;
        } catch (error) {
          console.warn('[ScrollingComments] failed to resolve global chat room id; disabling global comments', error);
          chatSchemaMissing = true;
          return;
        }
      }

      try {
        // Fetch recent comments
        const query = trackId
          ? supabase
              .from('track_comments')
              .select('id, comment, user_id, created_at, profiles(display_name)')
              .eq('track_id', trackId)
              .order('created_at', { ascending: false })
              .limit(20)
          : supabase
              .from('chat_messages')
              .select('id, message, user_id, created_at, profiles(display_name)')
              .eq('room_id', effectiveRoomId)
              .order('created_at', { ascending: false })
              .limit(20);

        const { data, error } = await query;
        if (error) {
          if ((error as any)?.code === 'PGRST205' || (error as any)?.message?.includes("Could not find the table 'public.chat_messages'")) {
            console.warn('[ScrollingComments] chat_messages table missing; disabling global comments');
            chatSchemaMissing = true;
          } else {
            console.warn('[ScrollingComments] skipping due to schema error', error);
          }
          setComments([]);
          disableRealtime = true;
        }

        if (data) {
          const formattedComments: Comment[] = data.map((item: any) => ({
            id: item.id,
            content: item.comment ?? item.message ?? item.content ?? '',
            author: item.profiles?.display_name || 'Anonymous',
            created_at: item.created_at,
          }));
          setComments(formattedComments.reverse());
        }
      } catch (error) {
        console.error('Failed to load scrolling comments:', error);
        setComments([]);
        disableRealtime = true;
      }

      if (disableRealtime) return;

      // Set up real-time subscription
      const table = trackId ? 'track_comments' : 'chat_messages';
      channel = supabase
        .channel(`scrolling-comments-${trackId || roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table,
            filter: trackId ? `track_id=eq.${trackId}` : `room_id=eq.${effectiveRoomId}`,
          },
          async (payload) => {
            try {
              // Fetch the author name
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', payload.new.user_id)
                .single();
              if (error) throw error;

              const newComment: Comment = {
                id: payload.new.id,
                content: payload.new.comment ?? payload.new.message ?? payload.new.content ?? '',
                author: profileData?.display_name || 'Anonymous',
                created_at: payload.new.created_at,
              };

              setComments((prev) => [...prev, newComment]);
            } catch (error) {
              console.error('Failed to hydrate scrolling comment:', error);
            }
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [trackId, roomId]);

  // Manage visible comments with auto-scroll
  useEffect(() => {
    if (comments.length === 0) return;
    if (maxVisible <= 0 || scrollSpeed <= 0) return;

    const interval = setInterval(() => {
      setComments((prev) => {
        if (prev.length === 0) return prev;
        const [next, ...rest] = prev;
        
        // Add to visible
        setVisibleComments((visible) => {
          const updated = [...visible, next];
          // Keep only maxVisible comments
          return updated.slice(-maxVisible);
        });

        return rest;
      });
    }, scrollSpeed / maxVisible);

    return () => clearInterval(interval);
  }, [comments.length, maxVisible, scrollSpeed]);

  // Auto-remove old comments after they fade
  useEffect(() => {
    if (visibleComments.length === 0) return;

    const timeout = setTimeout(() => {
      setVisibleComments((prev) => prev.slice(1));
    }, scrollSpeed);

    return () => clearTimeout(timeout);
  }, [visibleComments, scrollSpeed]);

  return (
    <div className="fixed bottom-24 left-0 right-0 z-40 pointer-events-none px-4 md:px-8">
      <div className="mx-auto max-w-2xl">
        <AnimatePresence mode="popLayout">
          {visibleComments.map((comment, index) => (
            <motion.div
              key={comment.id}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 - index * 0.15 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ 
                duration: 0.5,
                ease: 'easeOut',
              }}
              className="mb-2"
              style={{ 
                filter: `blur(${index * 0.5}px)`,
              }}
            >
              <div className="inline-block rounded-full bg-background/60 backdrop-blur-xl border border-border/30 px-4 py-2 shadow-lg">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{comment.author}:</span>{' '}
                  <span className="font-normal">{comment.content}</span>
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

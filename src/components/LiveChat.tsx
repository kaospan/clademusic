import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Users, X, Smile, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  reply_to?: string | null;
  user?: {
    id: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface UserPresence {
  user_id: string;
  status: 'online' | 'away' | 'offline';
  current_track_id?: string;
}

interface LiveChatProps {
  roomId?: string;
  roomType?: 'global' | 'track';
  trackId?: string;
  className?: string;
}

// If the backend environment doesn't provision chat_messages/chat_rooms, avoid repeated 404 spam
let chatSchemaMissing = false;

export function LiveChat({ 
  roomId = 'global', 
  roomType = 'global',
  trackId,
  className = '' 
}: LiveChatProps) {
  const chatDisabled = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
  const { user } = useAuth();
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (chatDisabled) {
    return null;
  }

  if (chatSchemaMissing) {
    return null;
  }

  // Get or create room
  useEffect(() => {
    if (!user) return;

    const initRoom = async () => {
      try {
        // For global room, use default
        if (roomType === 'global') {
          if (roomId !== 'global') {
            setActiveRoomId(roomId);
            loadMessages(roomId);
            return;
          }

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

          setActiveRoomId(globalRoom.id);
          loadMessages(globalRoom.id);
          return;
        }

        // For track-specific rooms, create if doesn't exist
        if (roomType === 'track' && trackId) {
          const { data: existingRoom } = await supabase
            .from('chat_rooms')
            .select('id')
            .eq('type', 'track')
            .eq('track_id', trackId)
            .single();

          if (existingRoom) {
            setActiveRoomId(existingRoom.id);
            loadMessages(existingRoom.id);
          } else {
            const { data: newRoom } = await supabase
              .from('chat_rooms')
              .insert({
                name: `Track Chat`,
                type: 'track',
                track_id: trackId,
              })
              .select('id')
              .single();

            if (newRoom) {
              setActiveRoomId(newRoom.id);
              loadMessages(newRoom.id);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing chat room:', error);
      }
    };

    initRoom();
  }, [user, roomId, roomType, trackId]);

  // Load messages
  const loadMessages = async (chatRoomId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          user_id,
          message,
          created_at,
          reply_to,
          user:profiles!chat_messages_user_id_fkey (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('room_id', chatRoomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        if ((error as any)?.code === 'PGRST205' || (error as any)?.message?.includes("Could not find the table 'public.chat_messages'")) {
          console.warn('[LiveChat] chat_messages table missing; disabling chat UI');
          chatSchemaMissing = true;
          setMessages([]);
          setIsLoading(false);
          return;
        }
        throw error;
      }
      setMessages(data || []);
      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to new messages
  useEffect(() => {
    if (!user || !activeRoomId) return;

    const channel = supabase
      .channel(`chat:${activeRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${activeRoomId}`,
        },
        async (payload) => {
          // Fetch user info for the new message
          const { data: userData } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          setMessages((prev) => [
            ...prev,
            {
              ...payload.new,
              user: userData,
            } as ChatMessage,
          ]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeRoomId]);

  // Subscribe to user presence
  useEffect(() => {
    if (!user) return;

    const presenceChannel = supabase.channel('online-users', {
      config: { presence: { key: user.id } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = Object.values(state).flat() as UserPresence[];
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            status: 'online',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);

  // Update presence on mount/unmount
  useEffect(() => {
    if (!user) return;

    const updatePresence = async (status: 'online' | 'offline') => {
      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          status,
          current_track_id: trackId,
          last_seen: new Date().toISOString(),
        });
    };

    updatePresence('online');

    return () => {
      updatePresence('offline');
    };
  }, [user, trackId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeRoomId) return;

    try {
      const { error } = await supabase.from('chat_messages').insert({
        room_id: activeRoomId,
        user_id: user.id,
        message: newMessage.trim(),
        reply_to: replyingTo?.id || null,
      });

      if (error) throw error;

      setNewMessage('');
      setReplyingTo(null);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!user) {
    return (
      <div className={`glass rounded-xl p-6 text-center ${className}`}>
        <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Sign in to chat with other music lovers
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col glass rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <h3 className="font-semibold">
            {roomType === 'global' ? 'Global Chat' : 'Track Chat'}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {onlineUsers.length} online
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 h-[400px]">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex gap-3 ${
                    msg.user_id === user.id ? 'flex-row-reverse' : ''
                  }`}
                >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    {msg.user?.avatar_url ? (
                      <img src={msg.user.avatar_url} alt="" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold">
                        {msg.user?.display_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </Avatar>

                  <div
                    className={`flex-1 min-w-0 ${
                      msg.user_id === user.id ? 'text-right' : ''
                    }`}
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-medium truncate">
                        {msg.user?.display_name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>

                    {msg.reply_to && (
                      <div className="text-xs text-muted-foreground mb-1 opacity-70">
                        <Reply className="w-3 h-3 inline mr-1" />
                        Replying to message
                      </div>
                    )}

                    <div
                      className={`inline-block px-3 py-2 rounded-lg max-w-[80%] break-words ${
                        msg.user_id === user.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                    </div>

                    {msg.user_id !== user.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs mt-1 opacity-0 hover:opacity-100 transition-opacity"
                        onClick={() => setReplyingTo(msg)}
                      >
                        <Reply className="w-3 h-3 mr-1" />
                        Reply
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        {replyingTo && (
          <div className="mb-2 p-2 bg-muted rounded-lg flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              <Reply className="w-3 h-3 inline mr-1" />
              Replying to {replyingTo.user?.display_name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setReplyingTo(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
            maxLength={500}
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

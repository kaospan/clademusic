import { useEffect, useMemo, useRef, useState } from 'react';
import { BOT_PROFILES, pickBotMessage, pickRandom } from '@/chat/bots';

export interface LocalChatMessage {
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

export interface LocalPresenceUser {
  user_id: string;
  status: 'online' | 'away' | 'offline';
}

const GUEST_ID_KEY = 'clade:chat:guest_id:v1';

function getOrCreateGuestId(random: () => number): string {
  try {
    const existing = window.localStorage.getItem(GUEST_ID_KEY);
    if (existing) return existing;
    const id = `guest-${Math.floor(random() * 1_000_000_000).toString(36)}`;
    window.localStorage.setItem(GUEST_ID_KEY, id);
    return id;
  } catch {
    return `guest-${Math.floor(random() * 1_000_000_000).toString(36)}`;
  }
}

function isoNow(now: () => Date): string {
  return now().toISOString();
}

type Options = {
  enabled: boolean;
  roomKey: string;
  localDisplayName?: string;
  trackTitle?: string;
  artist?: string;
  botIntervalMs?: number;
  now?: () => Date;
  random?: () => number;
  maxMessages?: number;
};

export function useLocalBotChat({
  enabled,
  roomKey,
  localDisplayName,
  trackTitle,
  artist,
  botIntervalMs = 4500,
  now = () => new Date(),
  random = Math.random,
  maxMessages = 120,
}: Options) {
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<LocalPresenceUser[]>([]);

  const localUserId = useMemo(() => {
    if (typeof window === 'undefined') return 'guest-server';
    return getOrCreateGuestId(random);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timerRef = useRef<number | null>(null);
  const lastRoomKeyRef = useRef<string | null>(null);

  const localUser = useMemo(
    () => ({
      id: localUserId,
      display_name: localDisplayName || 'You',
    }),
    [localDisplayName, localUserId],
  );

  useEffect(() => {
    if (!enabled) return;

    if (lastRoomKeyRef.current !== roomKey) {
      lastRoomKeyRef.current = roomKey;
      setMessages([]);
    }

    setOnlineUsers([
      { user_id: localUserId, status: 'online' },
      ...BOT_PROFILES.map((b) => ({ user_id: b.id, status: 'online' as const })),
    ]);

    setMessages((prev) => {
      if (prev.length > 0) return prev;
      const firstBot = BOT_PROFILES[0];
      const secondBot = BOT_PROFILES[1] ?? BOT_PROFILES[0]!;
      return [
        {
          id: `m-${roomKey}-seed-1`,
          user_id: firstBot.id,
          message: pickBotMessage({ trackTitle, artist }, () => 0.12),
          created_at: isoNow(now),
          reply_to: null,
          user: { id: firstBot.id, display_name: firstBot.displayName },
        },
        {
          id: `m-${roomKey}-seed-2`,
          user_id: secondBot.id,
          message: pickBotMessage({ trackTitle, artist }, () => 0.68),
          created_at: isoNow(now),
          reply_to: null,
          user: { id: secondBot.id, display_name: secondBot.displayName },
        },
      ];
    });

    const tick = () => {
      const bot = pickRandom(BOT_PROFILES, random);
      const message = pickBotMessage({ trackTitle, artist }, random);
      const createdAt = isoNow(now);

      setMessages((prev) => {
        const next: LocalChatMessage = {
          id: `m-${roomKey}-${bot.id}-${createdAt}`,
          user_id: bot.id,
          message,
          created_at: createdAt,
          reply_to: null,
          user: { id: bot.id, display_name: bot.displayName, avatar_url: bot.avatarUrl },
        };

        const merged = [...prev, next];
        return merged.length > maxMessages ? merged.slice(-maxMessages) : merged;
      });
    };

    timerRef.current = window.setInterval(tick, botIntervalMs);

    return () => {
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, roomKey, localUserId, botIntervalMs, now, random, maxMessages, trackTitle, artist]);

  const sendLocalMessage = (text: string, replyTo?: string | null) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const createdAt = isoNow(now);
    setMessages((prev) => {
      const next: LocalChatMessage = {
        id: `m-${roomKey}-${localUserId}-${createdAt}`,
        user_id: localUserId,
        message: trimmed,
        created_at: createdAt,
        reply_to: replyTo ?? null,
        user: { id: localUserId, display_name: localUser.display_name },
      };
      const merged = [...prev, next];
      return merged.length > maxMessages ? merged.slice(-maxMessages) : merged;
    });
  };

  return { messages, onlineUsers, localUserId, localUser, sendLocalMessage };
}


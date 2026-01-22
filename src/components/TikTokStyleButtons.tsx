import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface TikTokStyleButtonsProps {
  trackId: string;
  likes?: number;
  isLiked?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

/**
 * TikTok-style compact side buttons for mobile
 * Fixed to the right side with circular buttons stacked vertically
 */
export function TikTokStyleButtons({
  trackId,
  likes = 0,
  isLiked = false,
  onLike,
  onComment,
  onShare,
}: TikTokStyleButtonsProps) {
  const [localLiked, setLocalLiked] = useState(isLiked);
  const [localLikes, setLocalLikes] = useState(likes);

  const handleLike = () => {
    setLocalLiked(!localLiked);
    setLocalLikes(localLiked ? localLikes - 1 : localLikes + 1);
    onLike?.();
  };

  return (
    <div className="fixed right-3 bottom-32 z-50 flex flex-col gap-4 md:hidden">
      {/* Like Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleLike}
        className="flex flex-col items-center gap-1"
        aria-label={localLiked ? 'Unlike' : 'Like'}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background/80 backdrop-blur-xl border border-border/50 shadow-lg">
          <Heart
            className={`h-6 w-6 transition-all ${
              localLiked ? 'fill-red-500 text-red-500' : 'text-foreground'
            }`}
          />
        </div>
        {localLikes > 0 && (
          <span className="text-xs font-semibold text-foreground drop-shadow-lg">
            {localLikes >= 1000 ? `${(localLikes / 1000).toFixed(1)}k` : localLikes}
          </span>
        )}
      </motion.button>

      {/* Comment Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onComment}
        className="flex flex-col items-center gap-1"
        aria-label="Comment"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background/80 backdrop-blur-xl border border-border/50 shadow-lg">
          <MessageCircle className="h-6 w-6 text-foreground" />
        </div>
      </motion.button>

      {/* Share Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onShare}
        className="flex flex-col items-center gap-1"
        aria-label="Share"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background/80 backdrop-blur-xl border border-border/50 shadow-lg">
          <Share2 className="h-6 w-6 text-foreground" />
        </div>
      </motion.button>
    </div>
  );
}

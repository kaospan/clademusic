  import { motion, AnimatePresence } from 'framer-motion';
  import { X, Minimize2, Maximize2 } from 'lucide-react';
  import { useState, useRef, useEffect } from 'react';
  import { cn } from '@/lib/utils';

  interface FloatingPlayerProps {
    type: 'spotify' | 'youtube';
    trackId: string;
    title: string;
    artist?: string;
    onClose: () => void;
    seekTime?: number | null;
    isActive?: boolean;
  }

  export function FloatingPlayer({ type, trackId, title, artist, onClose, seekTime, isActive }: FloatingPlayerProps) {
    const [isMinimized, setIsMinimized] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [currentTrackId, setCurrentTrackId] = useState(trackId);

    const embedUrl = type === 'spotify'
      ? `https://open.spotify.com/embed/track/${currentTrackId}?utm_source=generator&theme=0&autoplay=1`
      : `https://www.youtube.com/embed/${currentTrackId}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;

  // Update iframe src when trackId changes without remounting
  useEffect(() => {
    if (trackId !== currentTrackId && iframeRef.current) {
      setCurrentTrackId(trackId);
    }
  }, [trackId, currentTrackId]);
  
  // Handle seek time for YouTube
  useEffect(() => {
    if (type === 'youtube' && seekTime !== null && seekTime !== undefined && iframeRef.current) {
      // Post message to YouTube iframe to seek
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [seekTime, true]
        }),
        '*'
      );
    }
  }, [seekTime, type]);

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: 100 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            x: 0,
            height: isMinimized ? '60px' : type === 'spotify' ? '352px' : '240px'
          }}
          exit={{ opacity: 0, scale: 0.8, x: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'rounded-xl shadow-2xl overflow-hidden',
            'glass-strong border transition-all',
            isActive ? 'border-primary/80 ring-2 ring-primary/30' : 'border-border/50',
            isMinimized ? 'w-72' : type === 'spotify' ? 'w-80' : 'w-96'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-background/80 backdrop-blur-sm border-b border-border/50">
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-sm font-medium truncate">{title}</p>
              {artist && <p className="text-xs text-muted-foreground truncate">{artist}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-destructive/20 hover:text-destructive rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

        {/* Player iframe */}
        {!isMinimized && (
          <div className={cn(
            'w-full',
            type === 'spotify' ? 'h-[304px]' : 'h-[192px]'
          )}>
            <iframe
              ref={iframeRef}
              key={`${type}-player`}
              src={embedUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="w-full h-full"
              style={{ borderRadius: '0' }}
              sandbox="allow-same-origin allow-scripts allow-presentation allow-forms"
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

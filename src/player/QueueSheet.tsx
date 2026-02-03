import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Track } from '@/types';
import { GripVertical, Music, Play, Shuffle, SkipForward, X } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';

interface QueueSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queue: Track[];
  currentIndex: number;
  onPlayTrack: (index: number) => void;
  onRemoveTrack: (index: number) => void;
  onReorderQueue: (newQueue: Track[]) => void;
  onClearQueue: () => void;
  onShuffleQueue: () => void;
}

function TrackThumb({ track, size }: { track: Track; size: number }) {
  if (track.cover_url) {
    return (
      <img
        src={track.cover_url}
        alt={track.title}
        className="rounded object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded bg-muted flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Music className="text-muted-foreground" style={{ width: Math.max(16, size * 0.5), height: Math.max(16, size * 0.5) }} />
    </div>
  );
}

export function QueueSheet({
  open,
  onOpenChange,
  queue = [],
  currentIndex = -1,
  onPlayTrack,
  onRemoveTrack,
  onReorderQueue,
  onClearQueue,
  onShuffleQueue,
}: QueueSheetProps) {
  const safeIndex = currentIndex >= 0 && currentIndex < queue.length ? currentIndex : -1;
  const currentTrack = safeIndex >= 0 ? queue[safeIndex] : null;
  const upNext = safeIndex >= 0 ? queue.slice(safeIndex + 1) : [];
  const previous = safeIndex >= 0 ? queue.slice(0, safeIndex) : [];

  const description =
    queue.length === 0
      ? 'No tracks in queue'
      : `${queue.length} track${queue.length === 1 ? '' : 's'} • ${upNext.length} up next`;

  const Header = (
    <div className="px-5 py-4 border-b flex items-start justify-between gap-3">
      <DialogHeader className="space-y-1">
        <DialogTitle className="flex items-center gap-2">
          <Music className="w-5 h-5" />
          Queue
        </DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onOpenChange(false)}
        aria-label="Close queue"
        title="Close queue"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );

  const Actions = queue.length > 0 && (
    <div className="px-5 py-3 border-b flex gap-2">
      <Button variant="outline" size="sm" onClick={onShuffleQueue} className="flex-1">
        <Shuffle className="w-4 h-4 mr-2" />
        Shuffle
      </Button>
      <Button variant="outline" size="sm" onClick={onClearQueue} className="flex-1">
        <X className="w-4 h-4 mr-2" />
        Clear
      </Button>
    </div>
  );

  const Body = (
    <ScrollArea className="flex-1">
      <div className="px-5 py-4 space-y-6">
        {currentTrack && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Now Playing</h3>
            <motion.div layout className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
              <TrackThumb track={currentTrack} size={48} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{currentTrack.title}</p>
                <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
              </div>
              <Play className="w-4 h-4 text-accent" />
            </motion.div>
          </div>
        )}

        {upNext.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <SkipForward className="w-4 h-4" />
              Up Next
            </h3>
            <Reorder.Group
              axis="y"
              values={upNext}
              onReorder={(newOrder) => {
                if (!currentTrack) return;
                onReorderQueue([...previous, currentTrack, ...newOrder]);
              }}
              className="space-y-2"
            >
              {upNext.map((track, idx) => (
                <Reorder.Item
                  key={track.id}
                  value={track}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-grab active:cursor-grabbing group"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  <TrackThumb track={track} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{track.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack(currentIndex + 1 + idx);
                    }}
                    aria-label={`Play ${track.title}`}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTrack(currentIndex + 1 + idx);
                    }}
                    aria-label={`Remove ${track.title} from queue`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        )}

        {previous.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Previously Played</h3>
            <div className="space-y-2 opacity-60">
              {previous.map((track, idx) => (
                <div key={`prev-${track.id}-${idx}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                  <TrackThumb track={track} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{track.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={() => onPlayTrack(idx)}
                    aria-label={`Play ${track.title}`}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {queue.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No tracks in queue</h3>
            <p className="text-sm text-muted-foreground">Start playing tracks to build your queue</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <>
      {/* Medium+ screens: persistent right sidebar (no modal backdrop). */}
      <aside
        className={[
          'hidden md:flex fixed inset-y-0 right-0 z-[80] w-[420px] max-w-[42vw] flex-col',
          'border-l bg-background shadow-2xl',
          'transition-transform duration-200 will-change-transform',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        aria-hidden={!open}
      >
        {Header}
        {Actions}
        {Body}
      </aside>

      {/* Mobile: modal dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="md:hidden p-0 max-w-[92vw] w-[92vw] h-[85vh] flex flex-col">
          {Header}
          {Actions}
          {Body}
        </DialogContent>
      </Dialog>
    </>
  );
}


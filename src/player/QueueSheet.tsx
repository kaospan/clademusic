import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Track } from '@/types';
import { Music, X, Play, GripVertical, Shuffle, SkipForward } from 'lucide-react';
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

export function QueueSheet({
  open,
  onOpenChange,
  queue,
  currentIndex,
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Queue
          </SheetTitle>
          <SheetDescription>
            {queue.length === 0 ? 'No tracks in queue' : `${queue.length} track${queue.length === 1 ? '' : 's'} • ${upNext.length} up next`}
          </SheetDescription>
        </SheetHeader>

        {queue.length > 0 && (
          <div className="px-6 py-3 border-b flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onShuffleQueue}
              className="flex-1"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Shuffle
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearQueue}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {/* Now Playing */}
            {currentTrack && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Now Playing</h3>
                <motion.div
                  layout
                  className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20"
                >
                  {currentTrack.cover_url ? (
                    <img
                      src={currentTrack.cover_url}
                      alt={currentTrack.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                      <Music className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{currentTrack.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                  </div>
                  <Play className="w-4 h-4 text-accent" />
                </motion.div>
              </div>
            )}

            {/* Up Next */}
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
                    const reordered = [...previous, currentTrack, ...newOrder];
                    onReorderQueue(reordered);
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
                      {track.cover_url ? (
                        <img
                          src={track.cover_url}
                          alt={track.title}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Music className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
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
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            )}

            {/* Previously Played */}
            {previous.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Previously Played</h3>
                <div className="space-y-2 opacity-60">
                  {previous.map((track, idx) => (
                    <div
                      key={`prev-${track.id}-${idx}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30"
                    >
                      {track.cover_url ? (
                        <img
                          src={track.cover_url}
                          alt={track.title}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Music className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{track.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => onPlayTrack(idx)}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {queue.length === 0 && (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Music className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No tracks in queue</h3>
                <p className="text-sm text-muted-foreground">
                  Start playing tracks to build your queue
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

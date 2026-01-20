/**
 * Sample Connections Component
 * 
 * WhoSampled-style display showing:
 * - Songs that sampled this track
 * - Songs this track sampled
 * - Connection type (vocals, hook, drums, bassline, melody, lyrics)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowDown, 
  ArrowUp, 
  Music2, 
  Mic2, 
  Drum, 
  Guitar, 
  Music, 
  FileText,
  ChevronRight,
  ExternalLink,
  Verified,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SampleConnection, SampleElement, Track } from '@/types';

interface SampleConnectionsProps {
  trackId: string;
  trackTitle: string;
  className?: string;
}

// Element type to icon/color mapping
const ELEMENT_CONFIG: Record<SampleElement, { icon: React.ElementType; label: string; color: string }> = {
  vocals: { icon: Mic2, label: 'Vocals', color: 'text-pink-500 bg-pink-500/10' },
  hook: { icon: Music2, label: 'Hook', color: 'text-purple-500 bg-purple-500/10' },
  drums: { icon: Drum, label: 'Drums', color: 'text-orange-500 bg-orange-500/10' },
  bassline: { icon: Guitar, label: 'Bassline', color: 'text-blue-500 bg-blue-500/10' },
  melody: { icon: Music, label: 'Melody', color: 'text-green-500 bg-green-500/10' },
  lyrics: { icon: FileText, label: 'Lyrics', color: 'text-yellow-500 bg-yellow-500/10' },
  multiple: { icon: Music2, label: 'Multiple Elements', color: 'text-accent bg-accent/10' },
  other: { icon: Music2, label: 'Other', color: 'text-muted-foreground bg-muted' },
};

// Mock data for demonstration
const mockSampledBy: SampleConnection[] = [
  {
    id: '1',
    original_track: { id: 'orig', title: '', artist: '' } as Track,
    sampling_track: {
      id: 's1',
      title: 'Lose Yourself',
      artist: 'Eminem',
      cover_url: 'https://i.scdn.co/image/ab67616d0000b273e1e7e9cf0e30d7a5b1c2f0a8',
      album: '8 Mile',
    } as Track,
    element: 'drums',
    description: 'Uses the iconic drum pattern from the original',
    verified: true,
    votes: 245,
  },
  {
    id: '2',
    original_track: { id: 'orig', title: '', artist: '' } as Track,
    sampling_track: {
      id: 's2',
      title: 'Gold Digger',
      artist: 'Kanye West',
      cover_url: 'https://i.scdn.co/image/ab67616d0000b273d4f5a8e2c1a2e3b4c5d6e7f8',
      album: 'Late Registration',
    } as Track,
    element: 'vocals',
    description: 'Samples the vocal hook from the chorus',
    verified: true,
    votes: 189,
  },
  {
    id: '3',
    original_track: { id: 'orig', title: '', artist: '' } as Track,
    sampling_track: {
      id: 's3',
      title: 'Uptown Funk',
      artist: 'Bruno Mars',
      cover_url: 'https://i.scdn.co/image/ab67616d0000b273a1b2c3d4e5f6a7b8c9d0e1f2',
      album: 'Uptown Special',
    } as Track,
    element: 'bassline',
    description: 'Interpolates the signature bassline',
    verified: false,
    votes: 67,
  },
];

const mockSamplesFrom: SampleConnection[] = [
  {
    id: '4',
    original_track: {
      id: 'o1',
      title: "I Got the...",
      artist: 'Labi Siffre',
      cover_url: 'https://i.scdn.co/image/ab67616d0000b273f1f2f3f4f5f6f7f8f9f0f1f2',
      album: 'Remember My Song',
    } as Track,
    sampling_track: { id: 'curr', title: '', artist: '' } as Track,
    element: 'hook',
    description: 'The main guitar riff was sampled for the beat',
    verified: true,
    votes: 312,
    start_time: 45,
  },
  {
    id: '5',
    original_track: {
      id: 'o2',
      title: 'Funky Drummer',
      artist: 'James Brown',
      cover_url: 'https://i.scdn.co/image/ab67616d0000b273c1c2c3c4c5c6c7c8c9c0c1c2',
      album: 'In the Jungle Groove',
    } as Track,
    sampling_track: { id: 'curr', title: '', artist: '' } as Track,
    element: 'drums',
    description: 'Classic breakbeat from the bridge section',
    verified: true,
    votes: 567,
    start_time: 128,
  },
];

function ElementBadge({ element }: { element: SampleElement }) {
  const config = ELEMENT_CONFIG[element];
  const Icon = config.icon;
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      config.color
    )}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

interface ConnectionCardProps {
  connection: SampleConnection;
  direction: 'sampled_by' | 'samples_from';
}

function ConnectionCard({ connection, direction }: ConnectionCardProps) {
  const track = direction === 'sampled_by' ? connection.sampling_track : connection.original_track;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: direction === 'sampled_by' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-3 p-3 glass rounded-xl hover:bg-muted/30 transition-colors group cursor-pointer"
    >
      {/* Album art */}
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
        {track.cover_url ? (
          <img 
            src={track.cover_url} 
            alt={track.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm truncate">{track.title}</h4>
          {connection.verified && (
            <Verified className="w-3.5 h-3.5 text-primary shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <ElementBadge element={connection.element} />
          {connection.start_time && (
            <span className="text-xs text-muted-foreground">
              @ {Math.floor(connection.start_time / 60)}:{String(connection.start_time % 60).padStart(2, '0')}
            </span>
          )}
        </div>
        {connection.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {connection.description}
          </p>
        )}
      </div>

      {/* Arrow */}
      <div className="flex items-center text-muted-foreground group-hover:text-primary transition-colors">
        <ChevronRight className="w-5 h-5" />
      </div>
    </motion.div>
  );
}

export function SampleConnections({ trackId, trackTitle, className }: SampleConnectionsProps) {
  const [activeTab, setActiveTab] = useState<'sampled_by' | 'samples_from'>('sampled_by');

  const sampledBy = mockSampledBy;
  const samplesFrom = mockSamplesFrom;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('sampled_by')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
            activeTab === 'sampled_by'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          )}
        >
          <ArrowUp className="w-4 h-4" />
          Sampled By ({sampledBy.length})
        </button>
        <button
          onClick={() => setActiveTab('samples_from')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
            activeTab === 'samples_from'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          )}
        >
          <ArrowDown className="w-4 h-4" />
          Samples ({samplesFrom.length})
        </button>
      </div>

      {/* Connection list */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-2"
        >
          {activeTab === 'sampled_by' ? (
            sampledBy.length > 0 ? (
              sampledBy.map(connection => (
                <ConnectionCard 
                  key={connection.id} 
                  connection={connection} 
                  direction="sampled_by" 
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Music2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No known songs have sampled this track yet</p>
              </div>
            )
          ) : (
            samplesFrom.length > 0 ? (
              samplesFrom.map(connection => (
                <ConnectionCard 
                  key={connection.id} 
                  connection={connection} 
                  direction="samples_from" 
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Music2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No known samples detected in this track</p>
              </div>
            )
          )}
        </motion.div>
      </AnimatePresence>

      {/* View more link */}
      {(activeTab === 'sampled_by' ? sampledBy : samplesFrom).length > 0 && (
        <button className="w-full py-2 text-sm text-primary hover:underline flex items-center justify-center gap-1">
          View all on WhoSampled
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

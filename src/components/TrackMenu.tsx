import { motion } from 'framer-motion';
import { MoreVertical, Album, User, Music2, Link2, ListMusic, PlaySquare } from 'lucide-react';
import { Track } from '@/types';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/player/PlayerContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface TrackMenuProps {
  track: Track;
}

export function TrackMenu({ track }: TrackMenuProps) {
  const navigate = useNavigate();
  const { enqueueNext, enqueueLater } = usePlayer();

  const handleViewAlbum = () => {
    if (track.album) {
      // Navigate to album page (you'll need to implement this)
      navigate(`/album/${encodeURIComponent(track.album)}`);
    }
  };

  const handleViewArtist = () => {
    if (track.artist) {
      navigate(`/artist/${encodeURIComponent(track.artist)}`);
    }
  };

  const handleSimilarChords = () => {
    if (track.progression_roman) {
      const chordQuery = track.progression_roman.join('-');
      navigate(`/search?mode=chord&q=${encodeURIComponent(chordQuery)}`);
    }
  };

  const handleViewSamples = () => {
    navigate(`/connections/${encodeURIComponent(track.id)}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => enqueueNext(track)}>
          <PlaySquare className="w-4 h-4 mr-2" />
          Play Next
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => enqueueLater(track)}>
          <ListMusic className="w-4 h-4 mr-2" />
          Add to Queue
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {track.album && (
          <DropdownMenuItem onClick={handleViewAlbum}>
            <Album className="w-4 h-4 mr-2" />
            View Album
          </DropdownMenuItem>
        )}
        {track.artist && (
          <DropdownMenuItem onClick={handleViewArtist}>
            <User className="w-4 h-4 mr-2" />
            View Artist
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {track.progression_roman && track.progression_roman.length > 0 && (
          <DropdownMenuItem onClick={handleSimilarChords}>
            <Music2 className="w-4 h-4 mr-2" />
            Similar Chord Progressions
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleViewSamples}>
          <Link2 className="w-4 h-4 mr-2" />
          View Samples & Connections
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BottomNav } from '@/components/BottomNav';
import { CladeLogoAnimated } from '@/components/icons/CladeIcon';
import { ProfileCircle } from '@/components/shared';
import { ChordBadge } from '@/components/ChordBadge';
import { HarmonyCard } from '@/components/HarmonyCard';
import { LineagePath } from '@/components/TrackLineageView';
import { seedTracks } from '@/data/seedTracks';
import { Track } from '@/types';
import { ArrowLeftRight, Check, Sparkles, Music, Key, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Simple similarity calculation based on roman numerals
function calculateSimilarity(track1: Track, track2: Track): number {
  if (!track1.progression_roman || !track2.progression_roman) return 0;

  const prog1 = track1.progression_roman.map((c) => c.toLowerCase());
  const prog2 = track2.progression_roman.map((c) => c.toLowerCase());

  // Count matching chords
  const matchingChords = prog1.filter((c) => prog2.includes(c)).length;
  const totalUniqueChords = new Set([...prog1, ...prog2]).size;

  // N-gram matching (2-grams)
  const getNGrams = (arr: string[], n: number) => {
    const grams: string[] = [];
    for (let i = 0; i <= arr.length - n; i++) {
      grams.push(arr.slice(i, i + n).join('-'));
    }
    return grams;
  };

  const grams1 = getNGrams(prog1, 2);
  const grams2 = getNGrams(prog2, 2);
  const matchingGrams = grams1.filter((g) => grams2.includes(g)).length;
  const totalGrams = Math.max(grams1.length, grams2.length) || 1;

  // Calculate base similarity
  const chordSimilarity = matchingChords / totalUniqueChords;
  const gramSimilarity = matchingGrams / totalGrams;

  // Length penalty
  const lengthDiff = Math.abs(prog1.length - prog2.length);
  const lengthPenalty = 1 - lengthDiff * 0.1;

  // Mode bonus
  const modeBonus = track1.detected_mode === track2.detected_mode ? 0.1 : 0;

  const similarity = (chordSimilarity * 0.3 + gramSimilarity * 0.5 + modeBonus) * Math.max(0.5, lengthPenalty);

  return Math.min(100, Math.round(similarity * 100));
}

function getSimilarityExplanation(track1: Track, track2: Track): string {
  if (!track1.progression_roman || !track2.progression_roman) {
    return 'Unable to compare - missing chord data';
  }

  const prog1 = track1.progression_roman;
  const prog2 = track2.progression_roman;

  const shared = prog1.filter((c) => prog2.map((x) => x.toLowerCase()).includes(c.toLowerCase()));

  if (shared.length === 0) {
    return 'No shared chords, different harmonic language';
  }

  const parts: string[] = [];
  
  if (shared.length === prog1.length && shared.length === prog2.length) {
    parts.push('Identical chord vocabulary');
  } else {
    parts.push(`${shared.length} shared chord(s): ${shared.join(', ')}`);
  }

  if (track1.detected_mode === track2.detected_mode && track1.detected_mode) {
    parts.push(`Both in ${track1.detected_mode}`);
  } else if (track1.detected_mode && track2.detected_mode) {
    parts.push(`Different modes (${track1.detected_mode} vs ${track2.detected_mode})`);
  }

  if (track1.cadence_type === track2.cadence_type && track1.cadence_type !== 'none') {
    parts.push(`Same ${track1.cadence_type} cadence`);
  }

  return parts.join('. ');
}

export default function ComparePage() {
  const [trackA, setTrackA] = useState<Track | null>(null);
  const [trackB, setTrackB] = useState<Track | null>(null);

  const similarity = trackA && trackB ? calculateSimilarity(trackA, trackB) : null;
  const explanation = trackA && trackB ? getSimilarityExplanation(trackA, trackB) : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong safe-top">
        <div className="pr-4 pl-36 sm:pl-44 py-4 max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CladeLogoAnimated size={22} className="text-primary" />
              <h1 className="text-xl font-bold">Compare</h1>
            </div>
            <ProfileCircle />
          </div>
          <p className="text-sm text-muted-foreground">
            Compare the harmonic DNA of two songs
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4 max-w-lg mx-auto space-y-6">
        {/* Track selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Track A</label>
            <Select
              value={trackA?.id}
              onValueChange={(id) => setTrackA(seedTracks.find((t) => t.id === id) || null)}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Select track" />
              </SelectTrigger>
              <SelectContent>
                {seedTracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    <span className="truncate">{track.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Track B</label>
            <Select
              value={trackB?.id}
              onValueChange={(id) => setTrackB(seedTracks.find((t) => t.id === id) || null)}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Select track" />
              </SelectTrigger>
              <SelectContent>
                {seedTracks.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    <span className="truncate">{track.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comparison view */}
        {trackA && trackB && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Similarity score */}
            <div className="text-center py-6">
              <div className="inline-flex items-center gap-4">
                <div className="flex flex-col items-center">
                  {trackA.cover_url && (
                    <img
                      src={trackA.cover_url}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover mb-2"
                    />
                  )}
                  <span className="text-xs text-muted-foreground truncate max-w-20">
                    {trackA.title}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="relative"
                  >
                    <div className="w-20 h-20 rounded-full glass-strong flex items-center justify-center">
                      <span className="text-2xl font-bold gradient-text">
                        {similarity}%
                      </span>
                    </div>
                    {similarity !== null && similarity >= 70 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </motion.div>
                    )}
                  </motion.div>
                  <span className="text-xs text-muted-foreground mt-2">
                    Similarity
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  {trackB.cover_url && (
                    <img
                      src={trackB.cover_url}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover mb-2"
                    />
                  )}
                  <span className="text-xs text-muted-foreground truncate max-w-20">
                    {trackB.title}
                  </span>
                </div>
              </div>
            </div>

            {/* Explanation */}
            {explanation && (
              <div className="p-4 glass rounded-xl">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium text-sm">Analysis</span>
                </div>
                <p className="text-sm text-foreground">{explanation}</p>
              </div>
            )}

            {/* Side by side comparison */}
            <div className="grid grid-cols-2 gap-4">
              {/* Track A details */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm">{trackA.artist}</h3>
                
                <div className="p-3 glass rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Key className="w-3 h-3" />
                    <span>
                      {trackA.detected_key || '?'} {trackA.detected_mode || ''}
                    </span>
                  </div>
                  
                  {trackA.cadence_type && trackA.cadence_type !== 'none' && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <RotateCcw className="w-3 h-3" />
                      <span className="capitalize">{trackA.cadence_type}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Music className="w-3 h-3" />
                    <span>{trackA.progression_roman?.length || 0} chords</span>
                  </div>
                </div>

                {trackA.progression_roman && (
                  <div className="flex flex-wrap gap-1">
                    {trackA.progression_roman.map((chord, i) => (
                      <ChordBadge key={i} chord={chord} size="sm" />
                    ))}
                  </div>
                )}
              </div>

              {/* Track B details */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm">{trackB.artist}</h3>
                
                <div className="p-3 glass rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Key className="w-3 h-3" />
                    <span>
                      {trackB.detected_key || '?'} {trackB.detected_mode || ''}
                    </span>
                  </div>
                  
                  {trackB.cadence_type && trackB.cadence_type !== 'none' && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <RotateCcw className="w-3 h-3" />
                      <span className="capitalize">{trackB.cadence_type}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Music className="w-3 h-3" />
                    <span>{trackB.progression_roman?.length || 0} chords</span>
                  </div>
                </div>

                {trackB.progression_roman && (
                  <div className="flex flex-wrap gap-1">
                    {trackB.progression_roman.map((chord, i) => (
                      <ChordBadge key={i} chord={chord} size="sm" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Lineage Path - show if tracks are connected */}
            {trackA.id && trackB.id && (
              <LineagePath startId={trackA.id} endId={trackB.id} />
            )}
          </motion.div>
        )}

        {/* Empty state */}
        {(!trackA || !trackB) && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
              <ArrowLeftRight className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Select two tracks to compare their harmonic structure
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

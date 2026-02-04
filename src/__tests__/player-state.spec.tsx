import React, { useEffect } from 'react';
import { describe, it, expect } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { PlayerProvider, usePlayer } from '@/player/PlayerContext';
import type { MusicProvider } from '@/types';

function withProvider(testFn: (ctx: ReturnType<typeof usePlayer>) => void | Promise<void>) {
  const Wrapper = () => {
    const ctx = usePlayer();
    useEffect(() => {
      void testFn(ctx);
    }, [ctx]);
    return null;
  };

  render(
    <React.StrictMode>
      <PlayerProvider>
        <Wrapper />
      </PlayerProvider>
    </React.StrictMode>
  );
}

describe('Player state invariants', () => {
  it('collapsing to mini does not stop playback', async () => {
    let latest: ReturnType<typeof usePlayer> | null = null;

    withProvider((ctx) => {
      latest = ctx;
    });

    await waitFor(() => expect(latest).toBeTruthy());
    act(() => {
      latest?.openPlayer({
        canonicalTrackId: 'track-1',
        provider: 'youtube' as MusicProvider,
        providerTrackId: 'y-1',
        title: 'Test Track',
        artist: 'Tester',
        autoplay: true,
      });
    });

    await waitFor(() => expect(latest?.isPlaying).toBe(true));

    act(() => {
      latest?.collapseToMini();
    });

    await waitFor(() => {
      expect(latest?.isMini).toBe(true);
      expect(latest?.isPlaying).toBe(true);
      expect(latest?.provider).toBe('youtube');
    });

    act(() => {
      latest?.restoreFromMini();
    });

    await waitFor(() => expect(latest?.isMini).toBe(false));
  });

  it('metadata falls back to last known instead of placeholders', async () => {
    let latest: ReturnType<typeof usePlayer> | null = null;

    withProvider((ctx) => {
      latest = ctx;
    });

    await waitFor(() => expect(latest).toBeTruthy());

    act(() => {
      latest?.openPlayer({
        canonicalTrackId: 'track-1',
        provider: 'spotify' as MusicProvider,
        providerTrackId: 's-1',
        title: 'First Title',
        artist: 'First Artist',
        autoplay: true,
      });
    });

    await waitFor(() => expect(latest?.trackTitle).toBe('First Title'));

    act(() => {
      // Switch track without passing metadata; should retain last known values
      latest?.openPlayer({
        canonicalTrackId: 'track-2',
        provider: 'spotify' as MusicProvider,
        providerTrackId: 's-2',
      });
    });

    await waitFor(() => {
      expect(latest?.trackTitle).toBe('First Title');
      expect(latest?.lastKnownTitle).toBe('First Title');
      expect(latest?.trackArtist).toBe('First Artist');
    });
  });

  it('provider switching remains atomic (only one provider open)', async () => {
    let latest: ReturnType<typeof usePlayer> | null = null;

    withProvider((ctx) => {
      latest = ctx;
    });

    await waitFor(() => expect(latest).toBeTruthy());

    act(() => {
      latest?.openPlayer({
        canonicalTrackId: 'track-a',
        provider: 'youtube' as MusicProvider,
        providerTrackId: 'ya',
        title: 'A',
        artist: 'Artist',
        autoplay: true,
      });
    });

    await waitFor(() => {
      expect(latest?.provider).toBe('youtube');
      expect(latest?.youtubeOpen).toBe(true);
      expect(latest?.spotifyOpen).toBe(false);
    });

    act(() => {
      latest?.switchProvider('spotify' as MusicProvider, 'sb', 'track-a');
    });

    await waitFor(() => {
      expect(latest?.provider).toBe('spotify');
      expect(latest?.spotifyOpen).toBe(true);
      expect(latest?.youtubeOpen).toBe(false);
      expect(latest?.isPlaying).toBe(true);
    });
  });

  it('cinema mode toggles without resetting playback intent', async () => {
    let latest: ReturnType<typeof usePlayer> | null = null;

    withProvider((ctx) => {
      latest = ctx;
    });

    await waitFor(() => expect(latest).toBeTruthy());

    act(() => {
      latest?.openPlayer({
        canonicalTrackId: 'track-c',
        provider: 'youtube' as MusicProvider,
        providerTrackId: 'yc',
        title: 'Cinema',
        artist: 'Artist',
        autoplay: true,
      });
    });

    await waitFor(() => expect(latest?.isPlaying).toBe(true));

    act(() => {
      latest?.enterCinema();
    });

    await waitFor(() => expect(latest?.isCinema).toBe(true));

    act(() => {
      latest?.exitCinema();
    });

    await waitFor(() => {
      expect(latest?.isCinema).toBe(false);
      expect(latest?.isPlaying).toBe(true);
    });
  });

  it('queues tracks for Next/Prev navigation', async () => {
    let latest: ReturnType<typeof usePlayer> | null = null;

    withProvider((ctx) => {
      latest = ctx;
    });

    await waitFor(() => expect(latest).toBeTruthy());

    act(() => {
      latest?.openPlayer({
        canonicalTrackId: 'track-1',
        provider: 'spotify' as MusicProvider,
        providerTrackId: 's-1',
        title: 'First',
        artist: 'Artist',
        autoplay: true,
      });
      latest?.openPlayer({
        canonicalTrackId: 'track-2',
        provider: 'spotify' as MusicProvider,
        providerTrackId: 's-2',
        title: 'Second',
        artist: 'Artist',
        autoplay: true,
      });
    });

    await waitFor(() => {
      expect(latest?.queue.length).toBe(2);
      expect(latest?.queueIndex).toBe(1);
    });

    act(() => {
      latest?.playFromQueue(0);
    });

    await waitFor(() => {
      expect(latest?.queueIndex).toBe(0);
      expect(latest?.trackId).toBe('s-1');
    });
  });
});

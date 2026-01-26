import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from '@/pages/ProfilePage';

// Mocks
const openPlayerMock = vi.fn();

vi.mock('@/player/PlayerContext', () => ({
  usePlayer: () => ({ openPlayer: openPlayerMock })
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'user@test.com' }, signOut: vi.fn(), loading: false })
}));

vi.mock('@/hooks/api/useProfile', () => ({
  useProfile: () => ({ data: { preferred_provider: 'spotify' } }),
  useUserProviders: () => ({ data: [{ id: 'p1', provider: 'spotify', connected_at: new Date().toISOString() }] }),
  useSetPreferredProvider: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/api/usePlayEvents', () => ({
  usePlayHistory: () => ({ data: [] }),
  usePlayStats: () => ({ data: { totalPlays: 0 } }),
}));

vi.mock('@/hooks/api/useFeed', () => ({
  useUserInteractionStats: () => ({ data: { likes: 0, saves: 0 } }),
}));

vi.mock('@/hooks/api/useSpotifyConnect', () => ({
  useConnectSpotify: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDisconnectSpotify: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/api/useSpotifyUser', () => ({
  useSpotifyConnected: () => ({ data: true }),
  useSpotifyProfile: () => ({ data: { displayName: 'Test User' } }),
  useSpotifyTopTracks: () => ({ data: [] }),
  useSpotifyTopArtists: () => ({ data: [] }),
  useSpotifyRecentlyPlayed: () => ({ data: { tracks: [
    { id: 't1', title: 'Song A', artist: 'Artist A', spotifyId: 's1', cover_url: '', played_at: new Date().toISOString() }
  ] } }),
  useMusicStats: () => ({ data: null }),
  useSpotifyRecommendations: () => ({ data: [] }),
}));

vi.mock('@/hooks/api/useLastFm', () => ({
  useLastFmUsername: () => ({ data: null }),
  useLastFmStats: () => ({ data: null }),
  useConnectLastFm: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDisconnectLastFm: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/api/useThemes', () => ({ useUserTheme: () => ({ data: null }) }));
vi.mock('@/hooks/api/useAdmin', () => ({ useIsAdmin: () => ({ data: false }) }));
vi.mock('@/hooks/api/useTasteDNA', () => ({ useTasteDNA: () => ({ data: null, isLoading: false }) }));

vi.mock('@/components/ThemeEditor', () => ({ ThemeEditor: () => null }));
vi.mock('@/components/ChordBadge', () => ({ ChordBadge: () => null }));

beforeEach(() => {
  openPlayerMock.mockReset();
});

describe('ProfilePage recent playback', () => {
  it('clicking recent track play button opens global player once', () => {
    const { getByLabelText } = render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    const playButton = getByLabelText('Play');
    fireEvent.click(playButton);

    expect(openPlayerMock).toHaveBeenCalledTimes(1);
    const call = openPlayerMock.mock.calls[0][0];
    expect(call.provider).toBe('spotify');
    expect(call.providerTrackId).toBe('s1');
    expect(call.title).toBe('Song A');
  });
});

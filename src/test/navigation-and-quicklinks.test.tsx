import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { QuickStreamButtons } from '@/components/QuickStreamButtons';

const openPlayerMock = vi.fn();

vi.mock('@/player/PlayerContext', () => ({
  usePlayer: () => ({
    openPlayer: openPlayerMock,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user' }, loading: false }),
}));

vi.mock('@/hooks/api/useSpotifyUser', () => ({
  useSpotifyConnected: () => ({ data: true }),
}));

vi.mock('@/hooks/api/useSpotifyConnect', () => ({
  useConnectSpotify: () => ({ mutateAsync: vi.fn() }),
}));

describe('Navigation & quicklinks regressions', () => {
  beforeEach(() => {
    openPlayerMock.mockClear();
    localStorage.clear();
  });

  it('routes Feed nav item to /feed', () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <BottomNav />
      </MemoryRouter>
    );

    const feedLink = screen.getByText('Feed').closest('a');
    expect(feedLink?.getAttribute('href')).toBe('/feed');
  });

  it('renders Spotify + YouTube quicklinks and triggers universal player', () => {
    render(
      <MemoryRouter>
        <QuickStreamButtons
          track={{ spotifyId: 's1', youtubeId: 'y1' }}
          trackTitle="Title"
          trackArtist="Artist"
        />
      </MemoryRouter>
    );

    const spotifyBtn = screen.getByLabelText(/spotify/i);
    const youtubeBtn = screen.getByLabelText(/youtube/i);

    fireEvent.click(spotifyBtn);
    fireEvent.click(youtubeBtn);

    expect(openPlayerMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'spotify', providerTrackId: 's1' })
    );
    expect(openPlayerMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'youtube', providerTrackId: 'y1' })
    );
  });
});

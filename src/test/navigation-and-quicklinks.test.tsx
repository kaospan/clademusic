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
      <QuickStreamButtons
        track={{ spotifyId: 's1', youtubeId: 'y1' }}
        canonicalTrackId="canon-1"
        trackTitle="Title"
        trackArtist="Artist"
      />
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

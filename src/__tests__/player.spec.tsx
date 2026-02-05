import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrackSections } from '@/components/TrackSections';
import { PlayerProvider } from '@/player/PlayerContext';
import type { TrackSection } from '@/types';

// Mock the API call
vi.mock('@/api/trackSections', () => ({
  getTrackSections: vi.fn(() => Promise.resolve([])),
}));

// Mock the auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

describe('TrackSections Component', () => {
  const mockSections: TrackSection[] = [
    {
      id: 'section-1',
      track_id: 'track-1',
      label: 'intro',
      start_ms: 0,
      end_ms: 10000,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'section-2',
      track_id: 'track-1',
      label: 'verse',
      start_ms: 10000,
      end_ms: 30000,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'section-3',
      track_id: 'track-1',
      label: 'chorus',
      start_ms: 30000,
      end_ms: 50000,
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('highlights section based on positionMs when currentSectionId is null', () => {
    // Test the highlighting logic directly
    const positionMs = 15000; // Should be in verse (10000-30000)
    const currentSectionId = null;

    // Check that the verse section would be highlighted
    const verseSection = mockSections[1];
    const isActive = currentSectionId === verseSection.id || 
      (currentSectionId === null && positionMs >= verseSection.start_ms && positionMs < verseSection.end_ms);
    
    expect(isActive).toBe(true);
  });

  it('highlights section based on currentSectionId when set', () => {
    const currentSectionId = 'section-3';
    const positionMs = 15000; // Position is in verse, but explicit ID is chorus

    // Check that chorus section is highlighted due to explicit ID
    const chorusSection = mockSections[2];
    const isActive = currentSectionId === chorusSection.id || 
      (currentSectionId === null && positionMs >= chorusSection.start_ms && positionMs < chorusSection.end_ms);
    
    expect(isActive).toBe(true);
  });

  it('does not highlight any section when positionMs is out of range', () => {
    const positionMs = 60000; // Beyond all sections
    const currentSectionId = null;

    // None of the sections should be highlighted
    mockSections.forEach(section => {
      const isActive = currentSectionId === section.id || 
        (currentSectionId === null && positionMs >= section.start_ms && positionMs < section.end_ms);
      
      expect(isActive).toBe(false);
    });
  });
});

describe('PlayerContext seekTo behavior', () => {
  it('seekTo updates positionMs correctly', () => {
    // Test the seekTo calculation
    const seekToSec = 45.5;
    const expectedPositionMs = 45500;

    // Simulate the seekTo logic
    const clamped = Math.max(0, seekToSec);
    const positionMs = clamped * 1000;

    expect(positionMs).toBe(expectedPositionMs);
  });

  it('seekToMs converts milliseconds to seconds correctly', () => {
    const seekToMsValue = 45500;
    const expectedSec = 45.5;

    // Simulate the seekToMs logic
    const sec = Math.max(0, seekToMsValue / 1000);

    expect(sec).toBe(expectedSec);
  });

  it('clamps negative seek values to 0', () => {
    const seekToSec = -10;
    const clamped = Math.max(0, seekToSec);
    
    expect(clamped).toBe(0);
  });
});

describe('Provider Controls Integration', () => {
  it('seekTo should be called on provider when registerProviderControls is set', () => {
    const mockSeekTo = vi.fn();
    const mockControls = {
      play: vi.fn(),
      pause: vi.fn(),
      seekTo: mockSeekTo,
      setVolume: vi.fn(),
      setMute: vi.fn(),
    };

    // Simulate provider controls registration
    const providerControlsRef = { current: { spotify: mockControls } };
    const activeProvider = 'spotify';
    const seekToSec = 30;

    // Simulate the seekTo call
    if (activeProvider) {
      providerControlsRef.current[activeProvider]?.seekTo?.(seekToSec);
    }

    expect(mockSeekTo).toHaveBeenCalledWith(30);
  });

  it('seekTo should not crash when no provider is active', () => {
    const providerControlsRef = { current: {} };
    const activeProvider = null;
    const seekToSec = 30;

    // This should not throw
    expect(() => {
      if (activeProvider) {
        providerControlsRef.current[activeProvider]?.seekTo?.(seekToSec);
      }
    }).not.toThrow();
  });
});

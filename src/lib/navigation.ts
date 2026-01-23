/**
 * Navigation Utilities
 * 
 * Centralized navigation helpers for consistent routing
 */

import type { NavigateFunction } from 'react-router-dom';

/**
 * Navigate to track detail page with proper ID encoding
 */
export function navigateToTrack(navigate: NavigateFunction, trackId: string) {
  navigate(`/track/${encodeURIComponent(trackId)}`);
}

/**
 * Navigate to artist page with proper ID encoding
 */
export function navigateToArtist(navigate: NavigateFunction, artistId: string) {
  navigate(`/artist/${encodeURIComponent(artistId)}`);
}

/**
 * Navigate to album page with proper ID encoding
 */
export function navigateToAlbum(navigate: NavigateFunction, albumId: string) {
  navigate(`/album/${encodeURIComponent(albumId)}`);
}

/**
 * Get track detail URL with proper encoding
 */
export function getTrackUrl(trackId: string): string {
  return `/track/${encodeURIComponent(trackId)}`;
}

/**
 * Get artist URL with proper encoding
 */
export function getArtistUrl(artistId: string): string {
  return `/artist/${encodeURIComponent(artistId)}`;
}

/**
 * Get album URL with proper encoding
 */
export function getAlbumUrl(albumId: string): string {
  return `/album/${encodeURIComponent(albumId)}`;
}

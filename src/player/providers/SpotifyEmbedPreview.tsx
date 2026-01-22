interface SpotifyEmbedPreviewProps {
  providerTrackId: string | null;
  autoplay?: boolean;
}

export function SpotifyEmbedPreview({ providerTrackId, autoplay }: SpotifyEmbedPreviewProps) {
  if (!providerTrackId) return null;
  const params = new URLSearchParams({
    utm_source: 'harmony-hub',
    theme: '0', // Dark theme
  });
  // Use compact embed (height 80) for audio-only experience
  const src = `https://open.spotify.com/embed/track/${providerTrackId}?${params.toString()}`;
  return (
    <div className="w-full h-14 md:h-20 bg-gradient-to-r from-green-950/80 via-black to-green-950/80 rounded-xl overflow-hidden">
      <iframe
        className="w-full h-full border-0 relative z-[110]"
        src={src}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen"
        loading="lazy"
        title="Spotify player"
        style={{ borderRadius: '12px' }}
      />
    </div>
  );
}

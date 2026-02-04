import { usePlayer } from '@/player/PlayerContext';

export default function E2EPlayerPage() {
  const { openPlayer } = usePlayer();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-6" data-e2e-player="true">
      <h1 className="text-2xl font-semibold">E2E Player Harness</h1>
      <div className="h-6 w-24 rounded bg-muted/60" data-feed />
      <div className="rounded-xl border border-border/60 bg-muted/40 p-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-provider="spotify"
            onClick={() =>
              openPlayer({
                canonicalTrackId: 'e2e-seed-1',
                provider: 'spotify',
                providerTrackId: '0VjIjW4GlUZAMYd2vXMi3b',
                autoplay: true,
                context: 'e2e',
                title: 'Blinding Lights',
                artist: 'The Weeknd',
              })
            }
            className="rounded-full px-4 py-2 text-sm font-semibold bg-[#1DB954] text-white"
          >
            Spotify
          </button>
          <button
            type="button"
            data-provider="youtube"
            onClick={() =>
              openPlayer({
                canonicalTrackId: 'e2e-seed-1',
                provider: 'youtube',
                providerTrackId: '4NRXx6U8ABQ',
                autoplay: true,
                context: 'e2e',
                title: 'Blinding Lights',
                artist: 'The Weeknd',
              })
            }
            className="rounded-full px-4 py-2 text-sm font-semibold bg-[#FF0000] text-white"
          >
            YouTube
          </button>
        </div>
      </div>
    </div>
  );
}

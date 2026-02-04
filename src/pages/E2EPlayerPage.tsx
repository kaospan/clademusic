import { QuickStreamButtons } from '@/components/QuickStreamButtons';

export default function E2EPlayerPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-6" data-e2e-player>
      <h1 className="text-2xl font-semibold">E2E Player Harness</h1>
      <div className="h-6 w-24 rounded bg-muted/60" data-feed />
      <div className="rounded-xl border border-border/60 bg-muted/40 p-6">
        <QuickStreamButtons
          track={{
            spotifyId: '0VjIjW4GlUZAMYd2vXMi3b',
            youtubeId: '4NRXx6U8ABQ',
            urlSpotifyWeb: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
            urlYoutube: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ',
          }}
          canonicalTrackId="e2e-seed-1"
          trackTitle="Blinding Lights"
          trackArtist="The Weeknd"
          size="lg"
        />
      </div>
    </div>
  );
}

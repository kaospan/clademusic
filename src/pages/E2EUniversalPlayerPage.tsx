import { QuickStreamButtons } from '@/components/QuickStreamButtons';

export default function E2EUniversalPlayerPage() {
  if (import.meta.env.MODE === 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="text-sm text-muted-foreground">Not available.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6" data-e2e-player>
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">E2E Universal Player Fixture</h1>
        <p className="text-sm text-muted-foreground">
          This page is for automated tests. It renders deterministic Quickstream buttons.
        </p>
      </header>

      <div className="h-6 w-24 rounded bg-muted/40" data-feed />

      <div className="space-y-4">
        <div className="rounded-lg border border-border p-4 space-y-2">
          <div className="text-sm font-medium">Track A</div>
          <QuickStreamButtons
            track={{ spotifyId: '4uLU6hMCjMI75M1A2tKUQC', youtubeId: 'kJQP7kiw5Fk' }}
            canonicalTrackId="e2e-track-a"
            trackTitle="E2E Track A"
            trackArtist="E2E Artist"
          />
        </div>

        <div className="rounded-lg border border-border p-4 space-y-2">
          <div className="text-sm font-medium">Track B</div>
          <QuickStreamButtons
            track={{ spotifyId: '7ouMYWpwJ422jRcDASZB7P', youtubeId: '3JZ4pnNtyxQ' }}
            canonicalTrackId="e2e-track-b"
            trackTitle="E2E Track B"
            trackArtist="E2E Artist"
          />
        </div>
      </div>
    </div>
  );
}


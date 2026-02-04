export type BotProfile = {
  id: string;
  displayName: string;
  avatarUrl?: string;
};

export const BOT_PROFILES: BotProfile[] = [
  { id: 'bot-cadence', displayName: 'Cadence' },
  { id: 'bot-voicing', displayName: 'Voicing' },
  { id: 'bot-groove', displayName: 'Groove' },
  { id: 'bot-tension', displayName: 'Tension' },
];

const MESSAGE_TEMPLATES: Array<(ctx: { trackTitle?: string; artist?: string }) => string> = [
  ({ trackTitle, artist }) =>
    trackTitle ? `That ${trackTitle}${artist ? ` — ${artist}` : ''} hook is sticky.` : `What are you listening to?`,
  ({ trackTitle }) => (trackTitle ? `Section jump to the chorus is the move.` : `Try jumping sections—intro vs chorus.`),
  ({ trackTitle }) => (trackTitle ? `Hearing a nice V→i pull in ${trackTitle}.` : `Any spicy cadences today?`),
  ({ trackTitle }) => (trackTitle ? `The groove in ${trackTitle} is doing work.` : `Drop a track; I’ll react.`),
  ({ trackTitle }) => (trackTitle ? `That bridge modulation caught me off guard.` : `Verse/chorus contrast is underrated.`),
];

export function pickRandom<T>(items: readonly T[], random: () => number = Math.random): T {
  if (items.length === 0) throw new Error('pickRandom called with empty items');
  const idx = Math.max(0, Math.min(items.length - 1, Math.floor(random() * items.length)));
  return items[idx]!;
}

export function pickBotMessage(
  ctx: { trackTitle?: string; artist?: string } = {},
  random: () => number = Math.random,
): string {
  const template = pickRandom(MESSAGE_TEMPLATES, random);
  return template(ctx);
}


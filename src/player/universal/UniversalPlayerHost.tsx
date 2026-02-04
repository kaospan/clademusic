import { useEffect, useMemo, useRef } from 'react';
import type { MusicProvider } from '@/types';
import { buildEmbedSrc, buildProviderDeepLink } from './buildEmbedSrc';
import { createDebouncedScheduler, sameTarget, type PlayTarget } from './switching';

export type UniversalPlayRequest = {
  provider: MusicProvider;
  id: string;
  title?: string | null;
  artist?: string | null;
  autoplay?: boolean;
  startSec?: number;
};

type UniversalPlayerHostProps = {
  request: UniversalPlayRequest | null;
  className?: string;
};

const IFRAME_ID = 'universal-player';

export function focusUniversalPlayerFrame() {
  try {
    const el = document.getElementById(IFRAME_ID);
    if (el && 'focus' in el) (el as HTMLIFrameElement).focus();
  } catch {
    // ignore
  }
}

export function UniversalPlayerHost({ request, className }: UniversalPlayerHostProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const seqRef = useRef(0);
  const lastScheduledRef = useRef<PlayTarget>(null);

  const baseUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL) || '/';
  const iframeSrc = useMemo(() => `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}universal-player.html`, [baseUrl]);

  const target = useMemo<PlayTarget>(() => {
    if (!request) return null;
    const src = buildEmbedSrc(request.provider, request.id, {
      autoplay: request.autoplay,
      startSec: request.startSec,
      youtubeNoCookie: true,
    });
    if (!src) return { provider: request.provider, id: request.id, src: '' };
    return { provider: request.provider, id: request.id, src };
  }, [request]);

  const deepLink = useMemo(() => {
    if (!request) return null;
    return buildProviderDeepLink(request.provider, request.id, { startSec: request.startSec });
  }, [request]);

  const schedulerRef = useRef<ReturnType<typeof createDebouncedScheduler> | null>(null);
  if (!schedulerRef.current && typeof window !== 'undefined') {
    schedulerRef.current = createDebouncedScheduler(200, (payload: any) => {
      const frame = iframeRef.current;
      if (!frame?.contentWindow) return;
      frame.contentWindow.postMessage(payload, window.location.origin);
    });
  }

  useEffect(() => {
    if (!target || !request) return;
    if (!schedulerRef.current) return;

    // If provider has no supported embed, don't attempt to load.
    if (!target.src) return;

    const next = target;
    if (sameTarget(lastScheduledRef.current, next)) return;
    lastScheduledRef.current = next;

    const requestId = ++seqRef.current;
    schedulerRef.current.request({
      type: 'universal-player:play',
      payload: {
        provider: request.provider,
        id: request.id,
        src: next.src,
        deepLink,
        title: request.title ?? null,
        artist: request.artist ?? null,
        requestId,
      },
    });
  }, [request, target, deepLink]);

  const showFallback = Boolean(request && target && !target.src);

  return (
    <div className={className}>
      <div className="relative w-full overflow-hidden rounded-lg bg-black/40 border border-white/10">
        <div className="w-full aspect-video">
          <iframe
            ref={iframeRef}
            id={IFRAME_ID}
            title="Universal player"
            src={iframeSrc}
            className="w-full h-full"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
          />
        </div>
      </div>

      {showFallback && request && (
        <div className="mt-2 text-xs text-white/70 flex items-center justify-between gap-2">
          <span>Embedded playback not available for {request.provider}. Open in provider instead.</span>
          <a
            href={deepLink || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-2 py-1 text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="Open in provider"
          >
            Open
          </a>
        </div>
      )}

      {request?.provider === 'spotify' && request?.id && (
        <div className="mt-2 text-[11px] text-white/55">
          If Spotify only plays a preview, open in Spotify to confirm sign-in, then retry:{' '}
          <a
            href={buildProviderDeepLink('spotify', request.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            Open in Spotify
          </a>
        </div>
      )}
    </div>
  );
}

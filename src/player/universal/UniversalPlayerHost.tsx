import { useEffect, useMemo, useRef } from 'react';
import { MusicProvider } from '@/types';
import { buildProviderDeepLink, buildProviderEmbedSrc } from './buildEmbedSrc';

export type UniversalPlayerRequest = {
  provider: MusicProvider;
  id: string;
  title?: string | null;
  artist?: string | null;
  autoplay?: boolean;
  startSec?: number | null;
};

const IFRAME_ID = 'universal-player-host';

export function UniversalPlayerHost(props: { request: UniversalPlayerRequest | null; className?: string }) {
  const { request, className } = props;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastSentRef = useRef<{ provider: MusicProvider; id: string; src: string } | null>(null);
  const requestIdRef = useRef(0);
  const pendingPayloadRef = useRef<unknown | null>(null);

  const hostSrc = useMemo(() => {
    const base = (import.meta as any).env?.BASE_URL ?? '/';
    return `${base}${String(base).endsWith('/') ? '' : '/'}universal-player.html`;
  }, []);

  const deepLink = useMemo(() => {
    if (!request) return null;
    return buildProviderDeepLink(request.provider, request.id, { startSec: request.startSec });
  }, [request]);

  useEffect(() => {
    if (!request) {
      lastSentRef.current = null;
      pendingPayloadRef.current = null;
      return;
    }

    const src = buildProviderEmbedSrc(request.provider, request.id, {
      autoplay: request.autoplay,
      startSec: request.startSec,
    });

    if (!src) {
      lastSentRef.current = null;
      pendingPayloadRef.current = null;
      return;
    }

    const lastSent = lastSentRef.current;
    if (lastSent && lastSent.provider === request.provider && lastSent.id === request.id && lastSent.src === src) {
      return;
    }

    requestIdRef.current += 1;
    lastSentRef.current = { provider: request.provider, id: request.id, src };

    const payload = {
      type: 'universal-player:play',
      payload: {
        provider: request.provider,
        id: request.id,
        src,
        deepLink,
        title: request.title ?? null,
        artist: request.artist ?? null,
        requestId: requestIdRef.current,
      },
    };

    pendingPayloadRef.current = payload;
    iframeRef.current?.contentWindow?.postMessage(payload, '*');
  }, [request, deepLink]);

  const embedUnavailable = Boolean(request && !buildProviderEmbedSrc(request.provider, request.id, { autoplay: request.autoplay }));

  return (
    <div className={className}>
      <div className="relative w-full overflow-hidden rounded-lg bg-black/40 border border-white/10">
        <div className="w-full h-[152px] sm:h-[168px]">
          <iframe
            ref={iframeRef}
            id={IFRAME_ID}
            title="Universal player"
            src={hostSrc}
            className="w-full h-full"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            // Avoid allow-same-origin to keep the sandbox meaningful.
            sandbox="allow-scripts allow-forms allow-popups allow-presentation"
            onLoad={() => {
              const payload = pendingPayloadRef.current;
              if (!payload) return;
              iframeRef.current?.contentWindow?.postMessage(payload, '*');
            }}
          />
        </div>
      </div>

      {embedUnavailable && request ? (
        <div className="mt-2 text-xs text-white/70 flex items-center justify-between gap-2">
          <span>Embedded playback not available for {request.provider}. Open in provider instead.</span>
          {deepLink ? (
            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-2 py-1 text-white/90 hover:bg-white/10"
            >
              Open
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

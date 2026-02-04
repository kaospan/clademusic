export type PlayTarget = { provider: string; id: string; src: string } | null;

export function sameTarget(a: PlayTarget, b: PlayTarget) {
  if (!a || !b) return false;
  return a.provider === b.provider && a.id === b.id && a.src === b.src;
}

export function createDebouncedScheduler<T>(delayMs: number, onFire: (payload: T) => void) {
  let timeout: number | null = null;
  let lastPayload: T | null = null;

  const cancel = () => {
    if (timeout != null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  const request = (payload: T) => {
    lastPayload = payload;
    cancel();
    timeout = window.setTimeout(() => {
      timeout = null;
      if (lastPayload != null) onFire(lastPayload);
    }, delayMs) as unknown as number;
  };

  return { request, cancel };
}


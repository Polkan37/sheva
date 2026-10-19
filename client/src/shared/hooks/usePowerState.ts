
import { useEffect, useState } from 'react';

import { getPowerState, type PowerState } from '../api/power';

const POLL_INTERVAL_MS = 60_000;

export function usePowerState(uid: string) {
  const [state, setState] = useState<PowerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const result = await getPowerState(
          uid,
          controller.signal,
        );

        if (controller.signal.aborted) return;

        setState(result);
        setError(null);
      } catch (error) {
        if (controller.signal.aborted) return;

        setError(
          error instanceof Error
            ? error.message
            : 'Failed to load power state',
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    setState(null);
    setLoading(true);
    setError(null);

    void load();

    const interval = setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [uid]);

  return { state, loading, error };
}


import { useEffect, useState } from 'react';
import {
  getMeasurements,
  type Measurement,
} from '../api/measurements';

export function useMeasurements(uid: string) {
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getMeasurements({
          uid,
          amount: 'latest',
        });

        if (!cancelled) {
          setMeasurement(data.measurements[0] ?? null);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setMeasurement(null);
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load measurements',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    setMeasurement(null);
    setLoading(true);
    setError(null);

    load();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  return { measurement, loading, error };
}

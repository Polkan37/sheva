import { useEffect, useState } from 'react'
import { getIntegrations } from '../api/integrations'
import type { Integration } from '../../entities/Integration/types'

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController()

    getIntegrations(controller.signal)
      .then(({ integrations }) => setIntegrations(integrations))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setError('Failed to load integrations')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  return { integrations, loading, error }
}
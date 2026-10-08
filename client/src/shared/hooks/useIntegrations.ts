import { useEffect, useState } from 'react'
import { getIntegrations } from '../api/integrations'
import type { Integration } from '../../entities/Integration/types'

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([])

  useEffect(() => {
    const controller = new AbortController()

    getIntegrations(controller.signal)
      .then(({ integrations }) => setIntegrations(integrations))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Failed to load integrations:', error)
        }
      })

    return () => controller.abort()
  }, [])

  return integrations
}
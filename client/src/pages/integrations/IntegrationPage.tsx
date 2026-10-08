import type { ComponentType } from 'react'
import { useParams } from 'react-router-dom'

import type { Integration } from '../../entities/Integration/types'
import { useIntegrations } from '../../shared/hooks/useIntegrations'
import { integrationConfig } from '../../features/Integrations/config'

export function IntegrationPage() {
  const integrations = useIntegrations()
  const { uid } = useParams<{ uid: string }>()

  if (!uid) return null

  const integration = integrations.find(
    (integration) => integration.uid === uid
  )

  if (!integration) {
    return <div>Integration not found</div>
  }

  const config =
    integrationConfig[
      integration.uid as keyof typeof integrationConfig
    ]

  if (!config) {
    return <div>Integration config not found</div>
  }

  const Page = config.Page as ComponentType<{
    integration: Integration
  }>

  return <Page integration={integration} />
}
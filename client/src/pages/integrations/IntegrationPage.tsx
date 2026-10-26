import type { ComponentType } from 'react'
import { useParams } from 'react-router-dom'

import type { Integration } from '../../entities/Integration/types'
import { useIntegrations } from '../../shared/hooks/useIntegrations'
import { integrationConfig } from '../../features/Integrations/config'

import { LoaderCircle } from 'lucide-react'

export function IntegrationPage() {
  const { integrations, loading, error } = useIntegrations()
  const { uid } = useParams<{ uid: string }>()

  if (loading) return  <div className="loading"><LoaderCircle size={32} className="spinner" /></div>
  if (error) return <div>{error}</div>

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
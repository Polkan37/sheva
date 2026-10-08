import { memo, type ComponentType } from 'react'
import { Link } from 'react-router-dom'

import type { Integration } from '../../entities/Integration/types'
import { useIntegrations } from '../../shared/hooks/useIntegrations'

import { integrationConfig } from './config'

export const Integrations = memo(function Integrations() {
  const integrations = useIntegrations();

  const integrationOrder = ['ukrhmc', 'yasno'];
  const sortedIntegrations = [...integrations].sort(
    (a, b) =>
      integrationOrder.indexOf(a.uid) -
      integrationOrder.indexOf(b.uid),
  )

  return (
    <div className="integrations">
      {sortedIntegrations.map((integration) => {
        const config =
          integrationConfig[
            integration.uid as keyof typeof integrationConfig
          ]

        if (!config) return null

        const Card = config.Card as ComponentType<{
          integration: Integration
        }>

        return (
          <Link
            key={integration.id}
            to={`/integrations/${integration.uid}`}
          >
            <Card integration={integration} />
          </Link>
        )
      })}
    </div>
  )
})
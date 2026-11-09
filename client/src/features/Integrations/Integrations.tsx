
import { memo, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

import type { Integration } from '../../entities/Integration/types';
import { useIntegrations } from '../../shared/hooks/useIntegrations';

import { integrationConfig } from './config';
import IntegrationStatusCard from './IntegrationStatusCard';

import styles from './Integrations.module.css';

export const Integrations = memo(function Integrations() {
  const { integrations, loading, error } = useIntegrations();

  if (loading || error) {
    return (
      <div className="integrations">
        <IntegrationStatusCard
          name="integration cards"
          state={loading ? 'loading' : 'error'}
        />
      </div>
    );
  }

  const integrationOrder = ['yasno', 'ukrhmc'];

  const sortedIntegrations = [...integrations].sort(
    (a, b) =>
      integrationOrder.indexOf(a.uid) -
      integrationOrder.indexOf(b.uid),
  );

  return (
    <div className="integrations">
      {sortedIntegrations.map(integration => {
        const config =
          integrationConfig[
            integration.uid as keyof typeof integrationConfig
          ];

        if (!config) return null;

        if (integration.availability === 'error') {
          return (
            <Link
              key={integration.id}
              to={`/integrations/${integration.uid}`}
            >
              <IntegrationStatusCard
                name={integration.name}
                state="error"
              />
            </Link>
          );
        }

        const Card = config.Card as ComponentType<{
          integration: Integration;
        }>;

        return (
          <Link
            key={integration.id}
            to={`/integrations/${integration.uid}`}
          >
            <div className={styles.cardWrapper}>
              <Card integration={integration} />

              {integration.availability === 'degraded' && (
                <div className={styles.warning}>
                  <AlertTriangle size={13} />
                  Не вдалося оновити дані
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
});

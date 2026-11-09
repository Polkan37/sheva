
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import styles from './IntegrationStatusCard.module.css';

type Props = {
  name: string;
  state: 'loading' | 'error';
};

export default function IntegrationStatusCard({
  name,
  state,
}: Props) {
  const loading = state === 'loading';

  return (
    <article className={styles.card} role="status">
      <h3>{name}</h3>

      <div className={styles.content}>
        {loading ? (
          <LoaderCircle className={styles.spinner} size={20} />
        ) : (
          <AlertTriangle size={20} />
        )}

        <span>
          {loading
            ? 'Loading...'
            : 'can’t load integration data'}
        </span>
      </div>

      <p className={styles.description}>
        {loading
          ? 'Waiting for the integration to load...'
          : 'Integration temporarily unavailable'}
      </p>
    </article>
  );
}

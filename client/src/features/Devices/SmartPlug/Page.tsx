
import { useEffect, useState } from 'react';
import { CircleHelp, Power, PowerOff, Plug } from 'lucide-react';

import type { Device } from '../../../shared/api/devices';
import {
    getPowerHistory,
    type PowerHistory,
    type PowerRange,
    type PowerStatus,
} from '../../../shared/api/power';
import { usePowerState } from '../../../shared/hooks/usePowerState';
import {
    formatDuration,
    getPowerStatistics,
} from './powerUtils';
import { PowerChart } from './PowerChart';

import styles from './Page.module.css';

type Props = {
    device: Device;
};

const ranges: PowerRange[] = ['24h', '7d', '30d'];

const labels: Record<PowerStatus, string> = {
    online: 'Online',
    offline: 'Offline',
    unknown: 'Unknown',
};

const icons = {
    online: Power,
    offline: PowerOff,
    unknown: CircleHelp,
};

function formatDate(value: string | null) {
    return value
        ? new Date(value).toLocaleString()
        : '—';
}

export function SmartPlugPage({ device }: Props) {
    const [range, setRange] = useState<PowerRange>('24h');
    const [history, setHistory] = useState<PowerHistory | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const {
        state,
        error: stateError,
    } = usePowerState(device.uid);

    const status = stateError
        ? 'unknown'
        : (state?.status ?? 'unknown');

    const StatusIcon = icons[status];

    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            try {
                const result = await getPowerHistory(
                    device.uid,
                    range,
                    controller.signal,
                );

                if (controller.signal.aborted) return;

                setHistory(result);
                setError(null);
            } catch (error) {
                if (controller.signal.aborted) return;

                setError(
                    error instanceof Error
                        ? error.message
                        : 'Failed to load power history',
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        setHistory(null);
        setLoading(true);
        setError(null);

        void load();

        const interval = setInterval(() => {
            void load();
        }, 60_000);

        return () => {
            clearInterval(interval);
            controller.abort();
        };
    }, [device.uid, range]);


    const stats = history
        ? getPowerStatistics(history)
        : null;

    const rangeDuration = history
        ? new Date(history.to).getTime() -
        new Date(history.from).getTime()
        : 0;

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <div className={styles.titleRow}>
                        <h2>
                            <Plug size={20} strokeWidth={1} />  {device.name}
                        </h2>

                        <span className={`${styles.badge} ${styles[status]}`}>
                            <StatusIcon size={14} />
                            {labels[status]}
                        </span>
                    </div>

                    {device.description && (
                        <p className={styles.description}>
                            {device.description}
                        </p>
                    )}
                </div>
            </header>

            <section className={styles.deviceInfo}>
                <div>
                    <span>Room</span>
                    <strong>{device.room?.name ?? '–'}</strong>
                </div>

                <div>
                    <span>Check interval</span>
                    <strong>60s</strong>
                </div>

                <div>
                    <span>Status since</span>
                    <strong>{formatDate(state?.since ?? null)}</strong>
                </div>

                <div>
                    <span>Last checked</span>
                    <strong>
                        {formatDate(state?.lastCheckedAt ?? null)}
                    </strong>
                </div>
            </section>

            <section>
                <h2>Current state</h2>

                <div className={styles.currentState}>
                    <StatusIcon
                        size={30}
                        strokeWidth={1.5}
                        className={styles[status]}
                    />

                    <div>
                        <strong>{labels[status]}</strong>
                        <p>
                            {status === 'online'
                                ? 'Smart plug is reachable.'
                                : status === 'offline'
                                    ? 'Smart plug is not reachable.'
                                    : 'Power supply status cannot be confirmed.'}
                        </p>
                    </div>
                </div>

                {stateError && (
                    <p className={styles.error}>{stateError}</p>
                )}
            </section>

            <section className={styles.analyticsHeader}>
                <h3>Power analytics</h3>

                <div className={styles.ranges}>
                    {ranges.map((item) => (
                        <button
                            type="button"
                            key={item}
                            onClick={() => setRange(item)}
                            className={
                                range === item ? styles.activeRange : ''
                            }
                            aria-pressed={range === item}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </section>

            {loading && !history && (
                <p>Loading analytics...</p>
            )}

            {error && <p className={styles.error}>{error}</p>}

            {stats && history && (
                <>
                    <section className={styles.statistics}>
                        <article className={styles.statCard}>
                            <span>Availability</span>
                            <strong>
                                {stats.availability !== null
                                    ? `${stats.availability.toFixed(1)}%`
                                    : '—'}
                            </strong>
                            <small>Excluding unknown periods</small>
                        </article>

                        <article className={styles.statCard}>
                            <span>Outages</span>
                            <strong>{stats.outages}</strong>
                            <small>Started in selected period</small>
                        </article>

                        <article className={styles.statCard}>
                            <span>Outage duration</span>
                            <strong>
                                {formatDuration(stats.duration.offline)}
                            </strong>
                            <small>Total offline time</small>
                        </article>

                        <article className={styles.statCard}>
                            <span>Monitoring coverage</span>
                            <strong>
                                {stats.coverage.toFixed(1)}%
                            </strong>
                            <small>Known monitoring status</small>
                        </article>
                    </section>

                    <section className={styles.history}>
                        <h3>Power history</h3>


                        <h4>Hourly</h4>
                        <PowerChart history={history} />


                        <h4>Total by category</h4>
                        <div
                            className={styles.timeline}
                            role="img"
                            aria-label="Power supply status timeline"
                        >
                            {stats.timeline.map((period) => (
                                <div
                                    key={period.id}
                                    className={`${styles.segment} ${styles[period.status]}`}
                                    style={{
                                        width: `${rangeDuration > 0
                                            ? (period.durationMs / rangeDuration) * 100
                                            : 0
                                            }%`,
                                    }}
                                    title={[
                                        labels[period.status],
                                        `${new Date(period.start).toLocaleString()} —`,
                                        new Date(period.end).toLocaleString(),
                                        formatDuration(period.durationMs),
                                    ].join(' ')}
                                />
                            ))}
                        </div>

                        <div className={styles.timelineDates}>
                            <span>{formatDate(history.from)}</span>
                            <span>{formatDate(history.to)}</span>
                        </div>

                        <div className={styles.legend}>
                            {(['online', 'offline', 'unknown'] as const)
                                .map((item) => (
                                    <span key={item}>
                                        <i className={styles[item]} />
                                        {labels[item]}
                                    </span>
                                ))}
                        </div>

                        <p className={styles.note}>
                            Offline indicates network unavailability
                            of the smart plug, not guaranteed loss
                            of electricity.
                        </p>
                    </section>

                    <section className={styles.history}>
                        <h3>Recent outages</h3>

                        {history.periods.filter(
                            (period) => period.status === 'offline',
                        ).length === 0 ? (
                            <p className={styles.description}>
                                No recorded outages in this period.
                            </p>
                        ) : (
                            <div className={styles.eventList}>
                                {history.periods
                                    .filter((period) => period.status === 'offline')
                                    .slice()
                                    .reverse()
                                    .map((period) => (
                                        <div key={period.id} className={styles.event}>
                                            <span>
                                                {formatDate(period.startedAt)}
                                            </span>

                                            <strong>
                                                {formatDuration(
                                                    Math.max(
                                                        0,
                                                        Math.min(
                                                            new Date(
                                                                period.endedAt ?? history.to,
                                                            ).getTime(),
                                                            new Date(history.to).getTime(),
                                                        ) -
                                                        Math.max(
                                                            new Date(
                                                                period.startedAt,
                                                            ).getTime(),
                                                            new Date(history.from).getTime(),
                                                        ),
                                                    ),
                                                )}
                                            </strong>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

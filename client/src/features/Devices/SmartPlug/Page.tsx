
import { useEffect, useState } from 'react';
import { CircleHelp, Power, PowerOff, Plug } from 'lucide-react';

import type { Device } from '../../../shared/api/devices';
import {
    getPowerHistory,
    type PowerHistory,
    type PowerRange,
    type PowerStatus,
    type PowerHistoryFilter,
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

function toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

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
    const [range, setRange] = useState<PowerRange | 'custom'>('24h');
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
    const [appliedPeriod, setAppliedPeriod] = useState<PowerHistoryFilter>('24h');

    const [customFrom, setCustomFrom] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 6);
        return toDateInputValue(date);
    });

    const [customTo, setCustomTo] = useState(() =>
        toDateInputValue(new Date())
    );

    const today = toDateInputValue(new Date());

    const isValidCustomRange =
        Boolean(customFrom && customTo) &&
        customFrom <= customTo &&
        customTo <= today;

    function applyCustomRange() {
        if (!isValidCustomRange) return;

        const from = new Date(`${customFrom}T00:00:00`);
        const to = new Date(`${customTo}T00:00:00`);

        to.setDate(to.getDate() + 1);

        setAppliedPeriod({
            from: from.toISOString(),
            to: new Date(Math.min(to.getTime(), Date.now())).toISOString(),
        });
    }

    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            try {
                const result = await getPowerHistory(
                    device.uid,
                    appliedPeriod,
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
    }, [device.uid, appliedPeriod]);


    const stats = history
        ? getPowerStatistics(history)
        : null;

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
                    <select
                        aria-label="Power analytics period"
                        className={styles.rangeSelect}
                        value={range}
                        onChange={(event) => {
                            const value = event.target.value as PowerRange | 'custom';

                            setRange(value);

                            if (value !== 'custom') {
                                setAppliedPeriod(value);
                            }
                        }}
                    >
                        <option value="24h">Last 24 hours</option>
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="custom">Custom range</option>
                    </select>

                    {range === 'custom' && (
                        <div className={styles.customRange}>
                            <label>
                                From
                                <input
                                    type="date"
                                    value={customFrom}
                                    max={customTo && customTo < today ? customTo : today}
                                    onChange={(event) => setCustomFrom(event.target.value)}
                                />
                            </label>

                            <label>
                                To
                                <input
                                    type="date"
                                    value={customTo}
                                    min={customFrom || undefined}
                                    max={today}
                                    onChange={(event) => setCustomTo(event.target.value)}
                                />
                            </label>

                            <button
                                type="button"
                                disabled={!isValidCustomRange}
                                onClick={applyCustomRange}
                            >
                                Apply
                            </button>
                        </div>
                    )}
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


                        <h4>Power supply status timeline</h4>
                        <PowerChart history={history} />


                        <h4>Total by category</h4>
                        <PowerChart history={history} mode="distribution" />

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

import { useEffect, useState } from 'react';

import {
    Chart as ChartJS,
    LinearScale,
    LineElement,
    PointElement,
    TimeScale,
    Tooltip,
    Legend,
    type ChartData,
    type ChartOptions,
} from 'chart.js';

import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import type { Device } from '../../../shared/api/devices';

import { getDeviceAnalytics, type AnalyticsResponse, type AnalyticsRange } from '../../../shared/api/analytics';

import styles from './Page.module.css';

ChartJS.register(
    LinearScale,
    TimeScale,
    LineElement,
    PointElement,
    Tooltip,
    Legend,
);

type THHomeContentProps = {
    device: Device;
};

const ranges: AnalyticsRange[] = [
    '1h',
    '6h',
    '24h',
    '7d',
    '30d',
];

function formatValue(
    value: number | null,
    digits = 1,
) {
    if (value === null) {
        return '—';
    }

    return value.toFixed(digits);
}

function formatDate(value: string | null) {
    if (!value) {
        return 'Never';
    }

    return new Date(value).toLocaleString();
}

type MetricChartProps = {
    analytics: AnalyticsResponse;
    metric: 'temperatureC' | 'humidityPct';
    label: string;
    unit: string;
};

function MetricChart({
    analytics,
    metric,
    label,
    unit,
}: MetricChartProps) {
    const chartColor = metric === 'temperatureC' ? '#e6c98d' : '#9fc5d8';

    const data: ChartData<'line'> = {
        datasets: [
            {
                label,
                data: analytics.data
                    .filter(
                        (point) =>
                            point[metric].avg !== null,
                    )
                    .map((point) => ({
                        x: new Date(
                            point.timestamp,
                        ).getTime(),

                        y: point[metric].avg as number,
                    })),
                backgroundColor: 'rgba(223, 230, 216, 0.15)',

                borderColor: chartColor,
                pointBackgroundColor: chartColor,
                pointBorderColor: chartColor,

                tension: 0.25,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2,
            },
        ],
    };

    const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,

        parsing: false,

        interaction: {
            mode: 'index',
            intersect: false,
        },

        plugins: {
            legend: {
                display: false,
            },

            tooltip: {
                callbacks: {
                    label(context) {
                        return `${label}: ${context.parsed.y.toFixed(1)}${unit}`;
                    },
                },
            },
        },

        scales: {
            x: {
                type: 'time',
                time: {
                    displayFormats: {
                        minute: 'HH:mm',
                        hour: 'HH:mm',
                        day: 'dd.MM',
                    },

                    tooltipFormat: 'dd.MM.yyyy HH:mm',
                },
                
                grid: {
                    color: 'rgba(255, 255, 255, 0.06)',
                },

                border: {
                    color: 'rgba(255, 255, 255, 0.15)',
                },

                ticks: {
                    color: 'rgba(255, 255, 255, 0.6)',
                    maxRotation: 0,
                },
            },

            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.08)',
                },

                border: {
                    color: 'rgba(255, 255, 255, 0.15)',
                },

                ticks: {
                    color: 'rgba(255, 255, 255, 0.6)',
                    stepSize: 0.1,

                    callback(value) {
                        return Number(value).toFixed(1);
                    },
                },

                title: {
                    display: true,
                    text: unit,
                    color: 'rgba(255, 255, 255, 0.55)',
                },
            },
        },
    };

    return (
        <div className={styles.chart}>
            <h3>{label}</h3>

            <div className={styles.chartContainer}>
                <Line
                    data={data}
                    options={options}
                />
            </div>
        </div>
    );
}

export function THHomePage({
    device,
}: THHomeContentProps) {
    const [range, setRange] =
        useState<AnalyticsRange>('24h');

    const [analytics, setAnalytics] =
        useState<AnalyticsResponse | null>(null);

    const [isLoading, setIsLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadAnalytics() {
            setIsLoading(true);
            setError(null);

            try {
                const result =
                    await getDeviceAnalytics(
                        device.uid,
                        range,
                    );

                if (!cancelled) {
                    setAnalytics(result);
                }
            } catch (error) {
                if (!cancelled) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : 'Failed to load analytics',
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        loadAnalytics();

        return () => {
            cancelled = true;
        };
    }, [device.uid, range]);

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <div className={styles.titleRow}>
                        <h2>{device.name}</h2>

                        <span
                            className={
                                device.online
                                    ? styles.online
                                    : styles.offline
                            }
                        >
                            {device.online
                                ? 'Online'
                                : 'Offline'}
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
                    <strong>
                        {device.room?.name ??
                            'Unknown'}
                    </strong>
                </div>

                <div>
                    <span>Firmware</span>
                    <strong>
                        {device.firmwareVersion ??
                            'Unknown'}
                    </strong>
                </div>

                <div>
                    <span>Sample interval</span>
                    <strong>
                        {device.sampleIntervalSec}s
                    </strong>
                </div>

                <div>
                    <span>Last seen</span>
                    <strong>
                        {formatDate(
                            device.lastSeenAt,
                        )}
                    </strong>
                </div>
            </section>

            <section className={styles.analyticsHeader}>
                <h3>Analytics</h3>

                <div className={styles.ranges}>
                    {ranges.map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() =>
                                setRange(item)
                            }
                            className={
                                range === item
                                    ? styles.activeRange
                                    : undefined
                            }
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </section>

            {isLoading && (
                <p>Loading analytics...</p>
            )}

            {error && (
                <p className={styles.error}>
                    {error}
                </p>
            )}

            {!isLoading &&
                !error &&
                analytics && (
                    <>
                        <section
                            className={
                                styles.statistics
                            }
                        >
                            <article
                                className={
                                    styles.statCard
                                }
                            >
                                <span>
                                    Temperature
                                </span>

                                <strong>
                                    {formatValue(
                                        analytics
                                            .summary
                                            .temperatureC
                                            .avg,
                                    )}
                                    °C
                                </strong>

                                <small>
                                    Min{' '}
                                    {formatValue(
                                        analytics
                                            .summary
                                            .temperatureC
                                            .min,
                                    )}
                                    ° · Max{' '}
                                    {formatValue(
                                        analytics
                                            .summary
                                            .temperatureC
                                            .max,
                                    )}
                                    °
                                </small>
                            </article>

                            <article
                                className={
                                    styles.statCard
                                }
                            >
                                <span>
                                    Humidity
                                </span>

                                <strong>
                                    {formatValue(
                                        analytics
                                            .summary
                                            .humidityPct
                                            .avg,
                                    )}
                                    %
                                </strong>

                                <small>
                                    Min{' '}
                                    {formatValue(
                                        analytics
                                            .summary
                                            .humidityPct
                                            .min,
                                    )}
                                    % · Max{' '}
                                    {formatValue(
                                        analytics
                                            .summary
                                            .humidityPct
                                            .max,
                                    )}
                                    %
                                </small>
                            </article>

                            <article
                                className={
                                    styles.statCard
                                }
                            >
                                <span>
                                    Battery
                                </span>

                                <strong>
                                    {formatValue(
                                        analytics
                                            .summary
                                            .batteryPct
                                            .avg,
                                        0,
                                    )}
                                    %
                                </strong>

                                <small>
                                    {formatValue(
                                        analytics
                                            .summary
                                            .batteryVoltage
                                            .avg,
                                        2,
                                    )}{' '}
                                    V
                                </small>
                            </article>
                        </section>

                        {analytics.data.length >
                            0 ? (
                            <section
                                className={
                                    styles.charts
                                }
                            >
                                <MetricChart
                                    analytics={
                                        analytics
                                    }
                                    metric="temperatureC"
                                    label="Temperature"
                                    unit="°C"
                                />

                                <MetricChart
                                    analytics={
                                        analytics
                                    }
                                    metric="humidityPct"
                                    label="Humidity"
                                    unit="%"
                                />
                            </section>
                        ) : (
                            <p>
                                No measurements for
                                this period.
                            </p>
                        )}

                        <footer
                            className={
                                styles.analyticsMeta
                            }
                        >
                            {analytics.returnedPoints}{' '}
                            points · approximately{' '}
                            {analytics.resolutionSec}s
                            per point
                        </footer>
                    </>
                )}
        </div>
    );
}
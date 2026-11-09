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
import { useMeasurements } from '../../../shared/hooks/useMeasurements';
import { getDeviceAnalytics, type AnalyticsResponse, type AnalyticsRange, type AnalyticsPeriod } from '../../../shared/api/analytics';
import { toDateInputValue } from '../../../shared/lib/format';

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

function MetricChart({ analytics }: { analytics: AnalyticsResponse }) {
    const getPoints = (metric: 'temperatureC' | 'humidityPct') =>
        analytics.data.map((point) => ({
            x: new Date(point.timestamp).getTime(),
            y: point[metric].avg,
        }));

    const data: ChartData<'line', { x: number; y: number | null }[]> = {
        datasets: [
            {
                label: 'Temperature',
                data: getPoints('temperatureC'),
                yAxisID: 'temperature',
                borderColor: '#e6c98d',
                backgroundColor: '#e6c98d',
                tension: 0.25,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2,
            },
            {
                label: 'Humidity',
                data: getPoints('humidityPct'),
                yAxisID: 'humidity',
                borderColor: '#9fc5d8',
                backgroundColor: '#9fc5d8',
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
                display: true,
                labels: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    usePointStyle: true,
                },
            },
            tooltip: {
                callbacks: {
                    label(context) {
                        const value = context.parsed.y;
                        const unit = context.dataset.yAxisID === 'temperature'
                            ? '°C'
                            : '%';

                        return `${context.dataset.label}: ${value === null ? '—' : `${value.toFixed(1)}${unit}`
                            }`;
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
                ticks: {
                    color: 'rgba(255, 255, 255, 0.6)',
                    maxRotation: 0,
                },
            },
            temperature: {
                type: 'linear',
                position: 'left',
                title: {
                    display: true,
                    text: '°C',
                    color: '#e6c98d',
                },
                ticks: {
                    color: '#e6c98d',
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.08)',
                },
            },
            humidity: {
                type: 'linear',
                position: 'right',
                title: {
                    display: true,
                    text: '%',
                    color: '#9fc5d8',
                },
                ticks: {
                    color: '#9fc5d8',
                },
                grid: {
                    drawOnChartArea: false,
                },
            },
        },
    };

    return (
        <div className={styles.chart}>
            <h3>Temperature & Humidity</h3>
            <div className={styles.chartContainer}>
                <Line data={data} options={options} />
            </div>
        </div>
    );
}


export function THHomePage({
    device,
}: THHomeContentProps) {
    const [range, setRange] = useState<AnalyticsRange | 'custom'>('24h');
    const [appliedPeriod, setAppliedPeriod] = useState<AnalyticsPeriod>('24h');
    const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { measurement, loading } = useMeasurements(device.uid);
    const batteryPercent = measurement?.batteryPct ?? null;
    const isLowBattery = batteryPercent !== null && batteryPercent <= 17;

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

        // Include the entire last selected day.
        to.setDate(to.getDate() + 1);

        setAppliedPeriod({
            from: from.toISOString(),
            to: new Date(Math.min(to.getTime(), Date.now())).toISOString(),
        });
    }

    useEffect(() => {
        let cancelled = false;

        async function loadAnalytics() {
            setIsLoading(true);
            setError(null);

            try {
                const result =
                    await getDeviceAnalytics(
                        device.uid,
                        appliedPeriod,
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
    }, [device.uid, appliedPeriod]);

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

            <section>
                <h2>Current state</h2>
            </section>

            {!loading && measurement ? (
                <section className={styles.statistics}>
                    <article className={styles.statCard}>
                        <span>Temperature</span>
                        <strong>
                            {measurement.temperatureC}°C
                        </strong>
                    </article>

                    <article className={styles.statCard}>
                        <span>Humidity</span>
                        <strong>
                            {measurement.humidityPct}%
                        </strong>
                    </article>

                    <article className={styles.statCard}>
                        <span>
                            {isLowBattery ? 'Low Battery' : 'Battery'}
                        </span>

                        <strong className={isLowBattery ? 'red-text' : ''}>
                            {batteryPercent !== null
                                ? `${batteryPercent}%`
                                : '—'}
                        </strong>

                        <small>
                            {formatValue(measurement.batteryVoltage, 2)} V
                        </small>
                    </article>
                </section>
            ) : !loading ? (
                <p>No measurements available.</p>
            ) : null}



            <section className={styles.analyticsHeader}>
                <h3>Analytics</h3>


                <div className={styles.ranges}>
                    <select
                        aria-label="Analytics period"
                        className={styles.rangeSelect}
                        value={range}
                        onChange={(event) => {
                            const value = event.target.value as AnalyticsRange | 'custom';

                            setRange(value);

                            if (value !== 'custom') {
                                setAppliedPeriod(value);
                            }
                        }}
                    >
                        <option value="1h">Last hour</option>
                        <option value="6h">Last 6 hours</option>
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
                                    max={customTo || today}
                                    onChange={(event) =>
                                        setCustomFrom(event.target.value)
                                    }
                                />
                            </label>

                            <label>
                                To
                                <input
                                    type="date"
                                    value={customTo}
                                    min={customFrom || undefined}
                                    max={today}
                                    onChange={(event) =>
                                        setCustomTo(event.target.value)
                                    }
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

            {isLoading && (
                <p>Loading analytics...</p>
            )}

            {error && (
                <p className={styles.error}>
                    {error}
                </p>
            )}

            { analytics && (
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
                                Average Temperature
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
                                Average Humidity
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
                    </section>

                    {analytics.data.length >
                        0 ? (
                        <section className={styles.charts}>
                            <MetricChart analytics={analytics} />
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
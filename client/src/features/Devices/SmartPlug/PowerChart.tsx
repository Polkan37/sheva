
import { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    TimeScale,
    Tooltip,
    type ChartOptions,
    type TooltipPositionerFunction,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

import type { PowerHistory, PowerStatus } from '../../../shared/api/power';
import { getPowerTimeline, formatDuration, getPowerStatistics } from './powerUtils';

import styles from './PowerChart.module.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    TimeScale,
    Tooltip,
);

declare module 'chart.js' {
    interface TooltipPositionerMap {
        cursor: TooltipPositionerFunction<'bar'>;
    }
}

Tooltip.positioners.cursor = function (_elements, eventPosition) {
    return {
        x: eventPosition.x,
        y: eventPosition.y,
        xAlign: 'center',
        yAlign: 'bottom',
    };
};

const COLORS: Record<PowerStatus, string> = {
    online: '#468b6a',
    offline: '#b66a5f',
    unknown: '#848484',
};

const LABELS: Record<PowerStatus, string> = {
    online: 'Power available',
    offline: 'Power unavailable',
    unknown: 'Unknown',
};

type Props = {
    history: PowerHistory;
    mode?: 'timeline' | 'distribution';
};

export function PowerChart({ history, mode = 'timeline' }: Props) {
    const timeline = useMemo(
        () => getPowerTimeline(history),
        [history],
    );


    const data = useMemo(() => ({
        labels: ['Power supply'],
        datasets: timeline.map((period) => ({
            label: LABELS[period.status],
            data: [{
                y: 'Power supply',
                x: [period.start, period.end],
            }],
            backgroundColor: COLORS[period.status],
            borderWidth: 0,
            borderSkipped: false as const,
            barThickness: 36,
            grouped: false,
        })),
    }), [timeline]);

    const fromMs = new Date(history.from).getTime();
    const toMs = new Date(history.to).getTime();
    const days = (toMs - fromMs) / 86_400_000;

    const options: ChartOptions<'bar'> = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
            legend: {
                display: false,
            },

            tooltip: {
                callbacks: {
                    title: () => '',
                    label: (context) => {
                        const period = timeline[context.datasetIndex];
                        if (!period) return '';

                        return [
                            LABELS[period.status],
                            new Date(period.start).toLocaleString(),
                            new Date(period.end).toLocaleString(),
                            formatDuration(period.durationMs),
                        ];
                    },
                },
            },
        },

        scales: {
            x: {
                type: 'time',
                min: fromMs,
                max: toMs,

                time: {
                    unit: days <= 1 ? 'hour' : 'day',
                    displayFormats: {
                        hour: 'HH:mm',
                        day: 'dd.MM',
                    },
                },

                ticks: {
                    color: 'rgba(255, 255, 255, 0.6)',
                    autoSkip: true,
                    maxTicksLimit: days <= 1 ? 13 : 10,
                    maxRotation: 0,
                },

                grid: {
                    color: 'rgba(255, 255, 255, 0.08)',
                },
            },

            y: {
                type: 'category',
                grid: {
                    display: false,
                },
                ticks: {
                    display: false,
                },
                border: {
                    display: false,
                },
            },
        },
    };

    if (mode === 'distribution') {
        const stats = getPowerStatistics(history);
        const total = toMs - fromMs;
        const statuses: PowerStatus[] = ['online', 'offline', 'unknown'];

        const distributionData = {
            labels: ['Power supply'],
            datasets: statuses.map((status) => ({
                label: LABELS[status],
                data: [
                    total > 0
                        ? (stats.duration[status] / total) * 100
                        : 0,
                ],
                backgroundColor: COLORS[status],
                borderWidth: 0,
                barThickness: 24,
                stack: 'power',
            })),
        };

        const distributionOptions: ChartOptions<'bar'> = {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    stacked: true,
                    min: 0,
                    max: 100,
                    display: false,
                },
                y: {
                    stacked: true,
                    display: false,
                },
            },
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    position: 'cursor',
                    caretPadding: 5,
                    callbacks: {
                        title: () => '',
                        label: (context) => {
                            const status = statuses[context.datasetIndex];
                            if (!status) return '';

                            return `${LABELS[status]}: ${formatDuration(
                                stats.duration[status],
                            )} (${context.parsed.x.toFixed(1)}%)`;
                        },
                    },
                },
            },
        };

        return (
            <div className={styles.chart}>
                <div className={`${styles.container} ${styles.distribution}`}>
                    <Bar data={distributionData} options={distributionOptions} />
                </div>
            </div>
        );
    }


    return (
        <div className={styles.chart}>
            <div className={styles.container}>
                <Bar data={data} options={options} />
            </div>

            <div className={styles.legend}>
                {(['online', 'offline', 'unknown'] as const).map(
                    (status) => (
                        <span key={status}>
                            <i style={{ backgroundColor: COLORS[status] }} />
                            {LABELS[status]}
                        </span>
                    ),
                )}
            </div>
        </div>
    );
}

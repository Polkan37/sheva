export type AnalyticsRange =
    | '1h'
    | '6h'
    | '24h'
    | '7d'
    | '30d';

export type AnalyticsMetric = {
    avg: number | null;
    min: number | null;
    max: number | null;
};

export type AnalyticsPoint = {
    timestamp: string;
    samples: number;

    temperatureC: AnalyticsMetric;
    humidityPct: AnalyticsMetric;
    batteryVoltage: AnalyticsMetric;
    batteryPct: AnalyticsMetric;
    rssiDbm: AnalyticsMetric;
};

export type AnalyticsResponse = {
    deviceUid: string;

    period: {
        from: string;
        to: string;
    };

    resolutionSec: number;

    requestedPoints: number;
    returnedPoints: number;

    summary: {
        samples: number;

        temperatureC: AnalyticsMetric;
        humidityPct: AnalyticsMetric;
        batteryVoltage: AnalyticsMetric;
        batteryPct: AnalyticsMetric;
        rssiDbm: AnalyticsMetric;
    };

    data: AnalyticsPoint[];
};

export async function getDeviceAnalytics(
    uid: string,
    range: AnalyticsRange,
    points = 200,
): Promise<AnalyticsResponse> {
    const params = new URLSearchParams({
        range,
        points: String(points),
    });

    const response = await fetch(
        `/api/devices/${uid}/analytics?${params}`,
    );

    if (!response.ok) {
        throw new Error(
            `Failed to load analytics: ${response.status}`,
        );
    }

    return response.json();
}
const UKRHMC_URL = "https://www.meteo.gov.ua/fmi.json";

type UkrHmcHourRaw = {
    epochtime: number;
    localtime: string;
    name: string;

    temperature: number;
    dewPoint: number;

    smartSymbol: number;
    smartSymbolText: string;

    windDirection: number;
    windSpeedMS: number;
    windCompass8: string;
    windgust: number;

    humidity: number;
    pressure: number;

    precipitation: number;
    precipitation1h: number;

    pop: number | null;

    dark: number;
};

type UkrHmcResponseRaw = {
    utc_time: string;

    dataTabs: {
        city: string;
        region: string | null;
        latlon: string;
    };

    data: Record<string, UkrHmcHourRaw[]>;
};

export type WeatherCurrent = {
    temperature: number;
    condition: string;
    conditionCode: number;

    humidity: number;
    pressure: number;

    precipitation: number;

    windSpeed: number;
    windDirection: number;
    windCompass: string;

    dewPoint: number;

    isNight: boolean;
};

export type WeatherForecastDay = {
    date: string;

    temperatureMin: number;
    temperatureMax: number;

    condition: string;
    conditionCode: number;

    precipitation: number;
};

export type UkrHmcWeather = {
    city: string;

    current: WeatherCurrent;

    forecast: WeatherForecastDay[];

    updatedAt: string;
};

export async function getUkrHmcWeather(): Promise<UkrHmcWeather> {

    const location = {
        city: process.env.LOCATION ?? "Kyiv",
        latitude: process.env.LATITUDE ?? 50.4501,
        longitude: process.env.LONGITUDE ?? 30.5234
    };
    const params = new URLSearchParams({
        action: "getCityWeather",
        city: location.city,
        latlon: `${location.latitude},${location.longitude}`,
        lang: "ua",
    });

    const response = await fetch(`${UKRHMC_URL}?${params.toString()}`, {
        headers: {
            Accept: "application/json, text/javascript, */*",
            Referer: "https://www.meteo.gov.ua/",
            "User-Agent": "Sheva/1.0",
        },
    });

    if (!response.ok) {
        throw new Error(`UkrHMC request failed: ${response.status}`);
    }

    const raw = (await response.json()) as UkrHmcResponseRaw;
    
    if (!raw?.data || typeof raw.data !== "object") {
        console.error("Unexpected UkrHMC response:", raw);
        throw new Error("UkrHMC returned invalid weather data");
    }

    const hours = Object.values(raw.data)
        .flat()
        .sort((a, b) => a.epochtime - b.epochtime);

    if (!hours.length) {
        throw new Error("UkrHMC returned no weather data");
    }

    const now = Math.floor(Date.now() / 1000);

    const currentHour =
        hours.find((item) => item.epochtime >= now) ??
        hours.at(-1);

    if (!currentHour) {
        throw new Error("UkrHMC returned no current weather data");
    }

    return {
        city: raw.dataTabs.city,

        current: {
            temperature: currentHour.temperature,
            condition: currentHour.smartSymbolText,
            conditionCode: currentHour.smartSymbol,

            humidity: currentHour.humidity,
            pressure: currentHour.pressure,

            precipitation: currentHour.precipitation1h,

            windSpeed: currentHour.windSpeedMS,
            windDirection: currentHour.windDirection,
            windCompass: currentHour.windCompass8,

            dewPoint: currentHour.dewPoint,

            isNight: currentHour.dark === 1,
        },

        forecast: buildDailyForecast(hours, 10),

        updatedAt: raw.utc_time,
    };
}

function buildDailyForecast(
    hours: UkrHmcHourRaw[],
    numberOfDays: number
): WeatherForecastDay[] {
    const days = new Map<string, UkrHmcHourRaw[]>();

    for (const hour of hours) {
        const date = formatLocalDate(hour.localtime);

        const existing = days.get(date);

        if (existing) {
            existing.push(hour);
        } else {
            days.set(date, [hour]);
        }
    }

    return [...days.entries()]
        .slice(0, numberOfDays)
        .map(([date, dayHours]) => {
            const temperatures = dayHours.map((item) => item.temperature);

            const precipitation = dayHours.reduce(
                (sum, item) => sum + (item.precipitation1h ?? 0),
                0
            );

            const representativeHour =
                dayHours.find((item) => item.localtime.slice(9, 11) === "14") ??
                dayHours[Math.floor(dayHours.length / 2)];

            if (!representativeHour) {
                throw new Error(`No weather data for ${date}`);
            }

            return {
                date,

                temperatureMin: Math.min(...temperatures),
                temperatureMax: Math.max(...temperatures),

                condition: representativeHour.smartSymbolText,
                conditionCode: representativeHour.smartSymbol,

                precipitation: round(precipitation, 1),
            };
        });
}

function formatLocalDate(localtime: string): string {
    const year = localtime.slice(0, 4);
    const month = localtime.slice(4, 6);
    const day = localtime.slice(6, 8);

    return `${year}-${month}-${day}`;
}

function round(value: number, decimals = 1): number {
    const multiplier = 10 ** decimals;

    return Math.round(value * multiplier) / multiplier;
}
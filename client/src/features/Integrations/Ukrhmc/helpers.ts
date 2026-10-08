
export function formatCondition(condition: string) {
    if (!condition) return "—";

    return condition
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .replace(/_/g, " ");
}

export function formatPrecipitation(value: number) {
    return `${round(value, 1)} mm`;
}

export function formatWind(value: number) {
    return `${round(value, 1)} m/s`;
}

export function round(value: number, decimals = 1) {
    const multiplier = 10 ** decimals;
    return Math.round(value * multiplier) / multiplier;
}

export function formatUpdatedAt(updatedAt: string) {
    const date = new Date(updatedAt);
    const now = new Date();

    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

    if (diffMinutes < 60) {
        return `Updated ${diffMinutes} min ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) {
        return `Updated ${diffHours} h ago`;
    }

    return `Updated ${date.toLocaleDateString("en-GB")}`;
}

export function formatForecastLabel(dateString: string, index: number) {
    if (index === 0) return "Today";
    if (index === 1) return "Tomorrow";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        weekday: "short",
    });
}

export function getWeatherIcon(
    code: number,
    isNight: boolean
) {
    const iconMap: Record<number, string> = {
        1: isNight ? "🌙" : "☀️",
        2: isNight ? "🌙" : "🌤️",
        4: "⛅",
        6: "🌥️",
        7: "☁️",
        34: "🌦️",
        37: "🌧️",
        101: "🌙",
        102: "🌙",
        104: "☁️",
        106: "☁️",
        107: "☁️",
        131: "🌧️",
        134: "🌦️",
        137: "🌧️",
    };

    return iconMap[code] ?? (isNight ? "🌙" : "⛅");
}
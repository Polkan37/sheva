export const formatTemperature = (value: number | undefined) => {
  if (value === undefined) return '—'
  return Number.isInteger(value) ? `${value}°C` : `${value.toFixed(1)}°C`
}

export const formatPercentage = (value: number | null | undefined) => value === null || value === undefined ? '—' : `${Math.round(value)}%`;
// export const formatBattery = (value: number | null) => value === null ? '—' : `${Math.round(value)} %`
// export const formatHumidity = (value: number) => `${Math.round(value)} %`

export function formatRelativeTime(value: string | null) {
  if (!value) return 'N/A'
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes} min ago`
  return `${Math.round(minutes / 60)} h ago`
}

export function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function formatDate(date: number | string) {
  return new Intl.DateTimeFormat('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
  }).format(new Date(date))
}

export function formatDateTimeNumbers(date: string | null) {
  if (!date) return '—';

  return new Intl.DateTimeFormat("uk-UA", {dateStyle: 'short', timeStyle: 'short' }).format(new Date(date));
};

export function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatMinutes(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

export function formatScheduleDate(date: string | number) {
    return new Intl.DateTimeFormat("uk-UA", {
        day: "numeric",
        month: "short",
    }).format(new Date(date));
}

export function formatAddress(address?: {
  street: string
  house: string
}) {
  if (!address) return null

  return [address.street, address.house]
    .filter(Boolean)
    .join(', ')
}
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

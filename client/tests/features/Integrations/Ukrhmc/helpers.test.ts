import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatCondition,
  formatForecastLabel,
  formatPrecipitation,
  formatUpdatedAt,
  formatWind,
  getWeatherIcon,
  round,
} from '@/features/Integrations/Ukrhmc/helpers'

describe('formatCondition', () => {
  it('returns a dash for an empty condition', () => {
    expect(formatCondition('')).toBe('—')
  })

  it('capitalizes the leading character and replaces underscores with spaces', () => {
    // underscore counts as a word character for \b, so only the very first
    // letter of the whole string is capitalized, not each underscore-joined part
    expect(formatCondition('partly_cloudy')).toBe('Partly cloudy')
  })

  it('capitalizes each space-separated word', () => {
    expect(formatCondition('light rain')).toBe('Light Rain')
  })
})

describe('round', () => {
  it('rounds to the given number of decimals', () => {
    expect(round(1.2345, 2)).toBe(1.23)
  })

  it('defaults to one decimal', () => {
    expect(round(1.26)).toBe(1.3)
  })
})

describe('formatPrecipitation', () => {
  it('formats with the mm unit', () => {
    expect(formatPrecipitation(2.34)).toBe('2.3 mm')
  })
})

describe('formatWind', () => {
  it('formats with the m/s unit', () => {
    expect(formatWind(3.26)).toBe('3.3 m/s')
  })
})

describe('formatUpdatedAt', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('clamps to "1 min ago" for anything under a minute', () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:30Z'))
    expect(formatUpdatedAt('2026-01-15T12:00:00Z')).toBe('Updated 1 min ago')
  })

  it('reports minutes ago under an hour', () => {
    vi.setSystemTime(new Date('2026-01-15T12:30:00Z'))
    expect(formatUpdatedAt('2026-01-15T12:00:00Z')).toBe('Updated 30 min ago')
  })

  it('reports hours ago under a day', () => {
    vi.setSystemTime(new Date('2026-01-15T15:00:00Z'))
    expect(formatUpdatedAt('2026-01-15T12:00:00Z')).toBe('Updated 3 h ago')
  })

  it('falls back to a calendar date at or beyond a day', () => {
    vi.setSystemTime(new Date('2026-01-17T12:00:00Z'))
    const result = formatUpdatedAt('2026-01-15T12:00:00Z')
    expect(result).toMatch(/^Updated \d{2}\/\d{2}\/\d{4}$/)
  })
})

describe('formatForecastLabel', () => {
  it('labels index 0 as Today', () => {
    expect(formatForecastLabel('2026-01-15', 0)).toBe('Today')
  })

  it('labels index 1 as Tomorrow', () => {
    expect(formatForecastLabel('2026-01-16', 1)).toBe('Tomorrow')
  })

  it('labels later indexes with a short weekday name', () => {
    const result = formatForecastLabel('2026-01-17', 2)
    expect(result).not.toBe('Today')
    expect(result).not.toBe('Tomorrow')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('getWeatherIcon', () => {
  it('returns the sun icon for clear day code', () => {
    expect(getWeatherIcon(1, false)).toBe('☀️')
  })

  it('returns the moon icon for clear night code', () => {
    expect(getWeatherIcon(1, true)).toBe('🌙')
  })

  it('returns the mapped icon regardless of night flag when not day/night-sensitive', () => {
    expect(getWeatherIcon(7, false)).toBe('☁️')
    expect(getWeatherIcon(7, true)).toBe('☁️')
  })

  it('falls back to a day/night default for unknown codes', () => {
    expect(getWeatherIcon(9999, false)).toBe('⛅')
    expect(getWeatherIcon(9999, true)).toBe('🌙')
  })
})

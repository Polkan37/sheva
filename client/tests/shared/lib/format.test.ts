import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatAddress,
  formatDate,
  formatDateTime,
  formatDateTimeNumbers,
  formatMinutes,
  formatPercentage,
  formatRelativeTime,
  formatScheduleDate,
  formatTemperature,
  formatTime,
} from '@/shared/lib/format'

describe('formatTemperature', () => {
  it('returns a dash placeholder when value is undefined', () => {
    expect(formatTemperature(undefined)).toBe('—')
  })

  it('formats integer values without decimals', () => {
    expect(formatTemperature(21)).toBe('21°C')
  })

  it('formats fractional values with one decimal', () => {
    expect(formatTemperature(21.456)).toBe('21.5°C')
  })

  it('formats negative integers correctly', () => {
    expect(formatTemperature(-5)).toBe('-5°C')
  })
})

describe('formatPercentage', () => {
  it('returns a dash placeholder for null', () => {
    expect(formatPercentage(null)).toBe('—')
  })

  it('returns a dash placeholder for undefined', () => {
    expect(formatPercentage(undefined)).toBe('—')
  })

  it('rounds fractional percentages', () => {
    expect(formatPercentage(45.6)).toBe('46%')
  })

  it('handles zero', () => {
    expect(formatPercentage(0)).toBe('0%')
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns N/A when value is null', () => {
    expect(formatRelativeTime(null)).toBe('N/A')
  })

  it('returns "now" for timestamps less than a minute old', () => {
    const value = new Date('2026-01-15T11:59:35Z').toISOString()
    expect(formatRelativeTime(value)).toBe('now')
  })

  it('returns minutes ago under an hour', () => {
    const value = new Date('2026-01-15T11:45:00Z').toISOString()
    expect(formatRelativeTime(value)).toBe('15 min ago')
  })

  it('returns hours ago at or beyond an hour', () => {
    const value = new Date('2026-01-15T09:00:00Z').toISOString()
    expect(formatRelativeTime(value)).toBe('3 h ago')
  })
})

describe('formatDateTime', () => {
  it('returns a dash placeholder for null', () => {
    expect(formatDateTime(null)).toBe('—')
  })

  it('formats a real date to a non-empty string', () => {
    const result = formatDateTime('2026-01-15T12:00:00Z')
    expect(result).not.toBe('—')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatDate', () => {
  it('formats a timestamp number', () => {
    const result = formatDate(new Date('2026-01-15T12:00:00Z').getTime())
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('formats a date string', () => {
    const result = formatDate('2026-01-15T12:00:00Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatDateTimeNumbers', () => {
  it('returns a dash placeholder for null', () => {
    expect(formatDateTimeNumbers(null)).toBe('—')
  })

  it('formats a real date to a non-empty string', () => {
    const result = formatDateTimeNumbers('2026-01-15T12:00:00Z')
    expect(result).not.toBe('—')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatTime', () => {
  it('formats a timestamp into HH:mm (24h)', () => {
    const result = formatTime(new Date('2026-01-15T12:30:00Z').getTime())
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })
})

describe('formatMinutes', () => {
  it('formats zero minutes', () => {
    expect(formatMinutes(0)).toBe('00:00')
  })

  it('pads single-digit hours and minutes', () => {
    expect(formatMinutes(65)).toBe('01:05')
  })

  it('formats minutes that roll into multiple hours', () => {
    expect(formatMinutes(150)).toBe('02:30')
  })

  it('formats a full day in minutes', () => {
    expect(formatMinutes(1440)).toBe('24:00')
  })
})

describe('formatScheduleDate', () => {
  it('formats a date string', () => {
    const result = formatScheduleDate('2026-01-15T12:00:00Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('formats a numeric timestamp', () => {
    const result = formatScheduleDate(new Date('2026-01-15T12:00:00Z').getTime())
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatAddress', () => {
  it('returns null when address is undefined', () => {
    expect(formatAddress(undefined)).toBeNull()
  })

  it('joins street and house with a comma', () => {
    expect(formatAddress({ street: 'Main St', house: '12' })).toBe('Main St, 12')
  })

  it('filters out an empty house value', () => {
    expect(formatAddress({ street: 'Main St', house: '' })).toBe('Main St')
  })
})

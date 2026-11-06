import { afterEach, describe, expect, it, vi } from 'vitest'
import { isTomorrow } from '@/shared/lib/isTomorrow'

describe('isTomorrow', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true for a timestamp that falls on tomorrow\'s calendar date', () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))
    const tomorrow = new Date('2026-01-16T12:00:00Z').getTime()
    expect(isTomorrow(tomorrow)).toBe(true)
  })

  it('returns false for a timestamp that falls on today', () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))
    const today = new Date('2026-01-15T14:00:00Z').getTime()
    expect(isTomorrow(today)).toBe(false)
  })

  it('returns false for a timestamp more than a day away', () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))
    const nextWeek = new Date('2026-01-22T12:00:00Z').getTime()
    expect(isTomorrow(nextWeek)).toBe(false)
  })
})

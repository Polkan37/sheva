import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDescription } from '@/features/Integrations/Yasno/getDescription'

describe('getDescription', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null when neither shutdown nor restore time is known', () => {
    expect(getDescription(null, null)).toBeNull()
  })

  it('describes an upcoming shutdown/restore window happening today', () => {
    vi.setSystemTime(new Date('2026-01-15T06:00:00Z'))
    const shutdown = new Date('2026-01-15T10:00:00Z').getTime()
    const restore = new Date('2026-01-15T14:00:00Z').getTime()

    const result = getDescription(shutdown, restore)

    expect(result).toContain('Наступне:')
    expect(result).not.toContain('завтра')
  })

  it('appends "завтра" when the next shutdown falls on tomorrow', () => {
    vi.setSystemTime(new Date('2026-01-15T10:00:00Z'))
    const shutdown = new Date('2026-01-16T10:00:00Z').getTime()
    const restore = new Date('2026-01-16T14:00:00Z').getTime()

    const result = getDescription(shutdown, restore)

    expect(result).toContain('завтра')
  })

  it('describes an ongoing outage when only a restore time is known', () => {
    const restore = new Date('2026-01-15T14:00:00Z').getTime()

    const result = getDescription(null, restore)

    expect(result).toContain('До')
    expect(result).toContain('немає світла')
  })

  it('returns null when only a shutdown time is known without a restore time', () => {
    const shutdown = new Date('2026-01-15T10:00:00Z').getTime()

    expect(getDescription(shutdown, null)).toBeNull()
  })
})

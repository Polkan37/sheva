import { describe, expect, it } from 'vitest'
import { formatDuration, getPowerStatistics, getPowerTimeline } from '@/features/Devices/SmartPlug/powerUtils'
import type { PowerHistory } from '@/shared/api/power'

function makeHistory(overrides: Partial<PowerHistory> = {}): PowerHistory {
  return {
    deviceUid: 'plug-1',
    from: '2026-01-01T00:00:00Z',
    to: '2026-01-02T00:00:00Z',
    periods: [],
    ...overrides,
  }
}

describe('getPowerTimeline', () => {
  it('fills a leading gap with an unknown period', () => {
    const history = makeHistory({
      periods: [
        { id: 1, status: 'online', startedAt: '2026-01-01T06:00:00Z', endedAt: '2026-01-01T12:00:00Z' },
      ],
    })

    const timeline = getPowerTimeline(history)

    expect(timeline[0]).toMatchObject({ status: 'unknown', start: Date.parse(history.from) })
    expect(timeline[1]).toMatchObject({ status: 'online' })
  })

  it('fills a trailing gap with an unknown period', () => {
    const history = makeHistory({
      periods: [
        { id: 1, status: 'online', startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-01T12:00:00Z' },
      ],
    })

    const timeline = getPowerTimeline(history)
    const last = timeline[timeline.length - 1]

    expect(last).toMatchObject({ status: 'unknown', end: Date.parse(history.to) })
  })

  it('clips periods that start before "from" to the range boundary', () => {
    const history = makeHistory({
      periods: [
        { id: 1, status: 'offline', startedAt: '2025-12-31T00:00:00Z', endedAt: '2026-01-01T06:00:00Z' },
      ],
    })

    const timeline = getPowerTimeline(history)

    expect(timeline[0]).toMatchObject({
      status: 'offline',
      start: Date.parse(history.from),
      end: Date.parse('2026-01-01T06:00:00Z'),
    })
  })

  it('clips open-ended periods (endedAt null) to "to"', () => {
    const history = makeHistory({
      periods: [{ id: 1, status: 'online', startedAt: '2026-01-01T00:00:00Z', endedAt: null }],
    })

    const timeline = getPowerTimeline(history)

    expect(timeline).toHaveLength(1)
    expect(timeline[0]).toMatchObject({ end: Date.parse(history.to) })
  })

  it('drops periods entirely outside the range', () => {
    const history = makeHistory({
      periods: [
        { id: 1, status: 'online', startedAt: '2025-01-01T00:00:00Z', endedAt: '2025-01-02T00:00:00Z' },
      ],
    })

    const timeline = getPowerTimeline(history)

    expect(timeline).toHaveLength(1)
    expect(timeline[0].status).toBe('unknown')
  })

  it('sorts out-of-order periods by start time and fills the gap between them', () => {
    const history = makeHistory({
      periods: [
        { id: 2, status: 'offline', startedAt: '2026-01-01T18:00:00Z', endedAt: '2026-01-01T20:00:00Z' },
        { id: 1, status: 'online', startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-01T06:00:00Z' },
      ],
    })

    const timeline = getPowerTimeline(history)
    const statuses = timeline.map((period) => period.status)

    expect(statuses).toEqual(['online', 'unknown', 'offline', 'unknown'])
  })

  it('merges a period that starts exactly where the previous one ends without a gap', () => {
    const history = makeHistory({
      periods: [
        { id: 1, status: 'online', startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-01T12:00:00Z' },
        { id: 2, status: 'offline', startedAt: '2026-01-01T12:00:00Z', endedAt: '2026-01-02T00:00:00Z' },
      ],
    })

    const timeline = getPowerTimeline(history)

    expect(timeline).toHaveLength(2)
    expect(timeline.map((p) => p.status)).toEqual(['online', 'offline'])
  })

  it('skips a period fully swallowed by the cursor advancing past it', () => {
    const history = makeHistory({
      periods: [
        { id: 1, status: 'online', startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-01T12:00:00Z' },
        { id: 2, status: 'offline', startedAt: '2026-01-01T02:00:00Z', endedAt: '2026-01-01T04:00:00Z' },
      ],
    })

    const timeline = getPowerTimeline(history)

    // the offline period is entirely swallowed by the online period that already
    // advanced the cursor past it, so it never appears in the timeline
    expect(timeline.map((p) => p.status)).toEqual(['online', 'unknown'])
  })

  it('returns a single full-range unknown period when there are no periods', () => {
    const history = makeHistory({ periods: [] })

    const timeline = getPowerTimeline(history)

    expect(timeline).toHaveLength(1)
    expect(timeline[0]).toMatchObject({
      status: 'unknown',
      start: Date.parse(history.from),
      end: Date.parse(history.to),
    })
  })
})

describe('getPowerStatistics', () => {
  it('computes availability from the ratio of online to known duration', () => {
    const history = makeHistory({
      periods: [
        { id: 1, status: 'online', startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-01T18:00:00Z' },
        { id: 2, status: 'offline', startedAt: '2026-01-01T18:00:00Z', endedAt: '2026-01-02T00:00:00Z' },
      ],
    })

    const stats = getPowerStatistics(history)

    expect(stats.availability).toBeCloseTo(75, 5)
    expect(stats.coverage).toBeCloseTo(100, 5)
  })

  it('returns null availability when there is no known (online+offline) duration', () => {
    const history = makeHistory({ periods: [] })

    const stats = getPowerStatistics(history)

    expect(stats.availability).toBeNull()
  })

  it('returns zero coverage when the range has no duration', () => {
    const history = makeHistory({ from: '2026-01-01T00:00:00Z', to: '2026-01-01T00:00:00Z', periods: [] })

    const stats = getPowerStatistics(history)

    expect(stats.coverage).toBe(0)
  })

  it('counts only offline periods that started within the range', () => {
    const history = makeHistory({
      periods: [
        // started before range -> clipped into the timeline but must not count as a "new" outage
        { id: 1, status: 'offline', startedAt: '2025-12-31T18:00:00Z', endedAt: '2026-01-01T06:00:00Z' },
        // started within range
        { id: 2, status: 'offline', startedAt: '2026-01-01T12:00:00Z', endedAt: '2026-01-01T13:00:00Z' },
      ],
    })

    const stats = getPowerStatistics(history)

    expect(stats.outages).toBe(1)
  })

  it('does not count an offline period that started exactly at "to"', () => {
    const history = makeHistory({
      periods: [
        { id: 1, status: 'offline', startedAt: '2026-01-02T00:00:00Z', endedAt: '2026-01-02T01:00:00Z' },
      ],
    })

    const stats = getPowerStatistics(history)

    expect(stats.outages).toBe(0)
  })

  it('sums durations per status across the whole timeline including filled gaps', () => {
    const history = makeHistory({
      periods: [
        { id: 1, status: 'online', startedAt: '2026-01-01T06:00:00Z', endedAt: '2026-01-01T18:00:00Z' },
      ],
    })

    const stats = getPowerStatistics(history)

    expect(stats.duration.online).toBe(12 * 60 * 60 * 1000)
    expect(stats.duration.unknown).toBe(12 * 60 * 60 * 1000)
    expect(stats.duration.offline).toBe(0)
  })
})

describe('formatDuration', () => {
  it('formats durations under an hour as minutes', () => {
    expect(formatDuration(5 * 60_000)).toBe('5m')
  })

  it('formats durations under a day as hours and minutes', () => {
    expect(formatDuration(90 * 60_000)).toBe('1h 30m')
  })

  it('formats durations of a day or more as days and hours', () => {
    expect(formatDuration((26 * 60 + 15) * 60_000)).toBe('1d 2h')
  })

  it('formats exactly zero as 0m', () => {
    expect(formatDuration(0)).toBe('0m')
  })
})

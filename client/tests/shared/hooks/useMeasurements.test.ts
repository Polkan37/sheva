import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api/measurements', () => ({
  getMeasurements: vi.fn(),
}))

import { getMeasurements, type Measurement } from '@/shared/api/measurements'
import { useMeasurements } from '@/shared/hooks/useMeasurements'

function makeMeasurement(overrides: Partial<Measurement> = {}): Measurement {
  return {
    id: 1,
    sequence: 1,
    capturedAt: '2026-01-15T12:00:00Z',
    receivedAt: '2026-01-15T12:00:01Z',
    temperatureC: 21,
    humidityPct: 40,
    batteryVoltage: 3.1,
    batteryPct: 80,
    rssiDbm: -60,
    firmwareVersion: '1.0.0',
    ...overrides,
  }
}

describe('useMeasurements', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts loading with no measurement', () => {
    vi.mocked(getMeasurements).mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useMeasurements('dev-1'))

    expect(result.current.loading).toBe(true)
    expect(result.current.measurement).toBeNull()
  })

  it('exposes the latest measurement on success', async () => {
    const measurement = makeMeasurement()
    vi.mocked(getMeasurements).mockResolvedValue({
      totalRecords: 1,
      startNumber: 0,
      returnedRecords: 1,
      nextStartNumber: null,
      measurements: [measurement],
    })

    const { result } = renderHook(() => useMeasurements('dev-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.measurement).toEqual(measurement)
    expect(result.current.error).toBeNull()
  })

  it('sets measurement to null when the response has no measurements', async () => {
    vi.mocked(getMeasurements).mockResolvedValue({
      totalRecords: 0,
      startNumber: 0,
      returnedRecords: 0,
      nextStartNumber: null,
      measurements: [],
    })

    const { result } = renderHook(() => useMeasurements('dev-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.measurement).toBeNull()
  })

  it('exposes an Error message on failure', async () => {
    vi.mocked(getMeasurements).mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useMeasurements('dev-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('boom')
    expect(result.current.measurement).toBeNull()
  })

  it('falls back to a generic error message for non-Error rejections', async () => {
    vi.mocked(getMeasurements).mockRejectedValue('string failure')

    const { result } = renderHook(() => useMeasurements('dev-1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Failed to load measurements')
  })

  it('resets state and refetches when uid changes', async () => {
    const first = makeMeasurement({ id: 1, temperatureC: 20 })
    const second = makeMeasurement({ id: 2, temperatureC: 25 })
    vi.mocked(getMeasurements)
      .mockResolvedValueOnce({
        totalRecords: 1,
        startNumber: 0,
        returnedRecords: 1,
        nextStartNumber: null,
        measurements: [first],
      })
      .mockResolvedValueOnce({
        totalRecords: 1,
        startNumber: 0,
        returnedRecords: 1,
        nextStartNumber: null,
        measurements: [second],
      })

    const { result, rerender } = renderHook(({ uid }) => useMeasurements(uid), {
      initialProps: { uid: 'dev-1' },
    })

    await waitFor(() => expect(result.current.measurement).toEqual(first))

    rerender({ uid: 'dev-2' })

    await waitFor(() => expect(result.current.measurement).toEqual(second))
    expect(getMeasurements).toHaveBeenCalledWith({ uid: 'dev-2', amount: 'latest' })
  })

  it('ignores a stale response that resolves after the uid has already changed', async () => {
    let resolveFirst!: (value: {
      totalRecords: number
      startNumber: number
      returnedRecords: number
      nextStartNumber: number | null
      measurements: Measurement[]
    }) => void

    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve
    })
    const second = makeMeasurement({ id: 2 })

    vi.mocked(getMeasurements)
      .mockReturnValueOnce(firstPromise as ReturnType<typeof getMeasurements>)
      .mockResolvedValueOnce({
        totalRecords: 1,
        startNumber: 0,
        returnedRecords: 1,
        nextStartNumber: null,
        measurements: [second],
      })

    const { result, rerender } = renderHook(({ uid }) => useMeasurements(uid), {
      initialProps: { uid: 'dev-1' },
    })

    rerender({ uid: 'dev-2' })
    await waitFor(() => expect(result.current.measurement).toEqual(second))

    // the stale first request now resolves — it must not clobber the newer state
    resolveFirst({
      totalRecords: 1,
      startNumber: 0,
      returnedRecords: 1,
      nextStartNumber: null,
      measurements: [makeMeasurement({ id: 1 })],
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current.measurement).toEqual(second)
  })

  it('ignores a stale rejection that resolves after the uid has already changed', async () => {
    let rejectFirst!: (reason: unknown) => void
    const firstPromise = new Promise((_resolve, reject) => {
      rejectFirst = reject
    })
    const second = makeMeasurement({ id: 2 })

    vi.mocked(getMeasurements)
      .mockReturnValueOnce(firstPromise as ReturnType<typeof getMeasurements>)
      .mockResolvedValueOnce({
        totalRecords: 1,
        startNumber: 0,
        returnedRecords: 1,
        nextStartNumber: null,
        measurements: [second],
      })

    const { result, rerender } = renderHook(({ uid }) => useMeasurements(uid), {
      initialProps: { uid: 'dev-1' },
    })

    rerender({ uid: 'dev-2' })
    await waitFor(() => expect(result.current.measurement).toEqual(second))

    rejectFirst(new Error('stale failure'))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(result.current.measurement).toEqual(second)
    expect(result.current.error).toBeNull()
  })
})

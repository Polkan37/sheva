import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMeasurements } from '@/shared/api/measurements'

function mockResponse(ok: boolean, json: unknown) {
  return { ok, json: () => Promise.resolve(json) } as Response
}

describe('getMeasurements', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests the latest measurement without a startNumber', async () => {
    const payload = {
      totalRecords: 1,
      startNumber: 0,
      returnedRecords: 1,
      nextStartNumber: null,
      measurements: [],
    }
    vi.mocked(fetch).mockResolvedValue(mockResponse(true, payload))

    const result = await getMeasurements({ uid: 'dev-1', amount: 'latest' })

    expect(fetch).toHaveBeenCalledWith('/api/devices/dev-1/measurements?amount=latest')
    expect(result).toEqual(payload)
  })

  it('includes startNumber in the query string when provided', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse(true, {
        totalRecords: 0,
        startNumber: 0,
        returnedRecords: 0,
        nextStartNumber: null,
        measurements: [],
      }),
    )

    await getMeasurements({ uid: 'dev-1', amount: 10, startNumber: 5 })

    expect(fetch).toHaveBeenCalledWith(
      '/api/devices/dev-1/measurements?amount=10&startNumber=5',
    )
  })

  it('throws when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(false, {}))

    await expect(getMeasurements({ uid: 'dev-1', amount: 'latest' })).rejects.toThrow(
      'Failed to load measurements',
    )
  })
})

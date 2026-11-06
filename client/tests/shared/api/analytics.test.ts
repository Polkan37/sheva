import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDeviceAnalytics } from '@/shared/api/analytics'

function mockResponse(ok: boolean, status: number, json: unknown) {
  return { ok, status, json: () => Promise.resolve(json) } as Response
}

describe('getDeviceAnalytics', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests analytics with the default points count', async () => {
    const payload = { deviceUid: 'dev-1', data: [] }
    vi.mocked(fetch).mockResolvedValue(mockResponse(true, 200, payload))

    const result = await getDeviceAnalytics('dev-1', '24h')

    expect(fetch).toHaveBeenCalledWith('/api/devices/dev-1/analytics?range=24h&points=200')
    expect(result).toEqual(payload)
  })

  it('allows overriding the requested points count', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(true, 200, { deviceUid: 'dev-1', data: [] }))

    await getDeviceAnalytics('dev-1', '7d', 50)

    expect(fetch).toHaveBeenCalledWith('/api/devices/dev-1/analytics?range=7d&points=50')
  })

  it('throws with the status code when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(false, 503, {}))

    await expect(getDeviceAnalytics('dev-1', '24h')).rejects.toThrow(
      'Failed to load analytics: 503',
    )
  })
})

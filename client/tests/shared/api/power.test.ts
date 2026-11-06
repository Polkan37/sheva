import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api/client', () => ({
  apiFetch: vi.fn(),
  apiRequest: vi.fn(),
}))

import { apiFetch } from '@/shared/api/client'
import { getPowerHistory, getPowerState } from '@/shared/api/power'

describe('power api', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('getPowerState fetches the power endpoint for the device uid', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      deviceUid: 'plug-1',
      status: 'online',
      since: null,
      lastCheckedAt: null,
    })
    const controller = new AbortController()

    await getPowerState('plug-1', controller.signal)

    expect(apiFetch).toHaveBeenCalledWith('/api/devices/plug-1/power', controller.signal)
  })

  it('encodes the uid in getPowerState', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      deviceUid: 'a/b',
      status: 'online',
      since: null,
      lastCheckedAt: null,
    })

    await getPowerState('a/b')

    expect(apiFetch).toHaveBeenCalledWith('/api/devices/a%2Fb/power', undefined)
  })

  it('getPowerHistory fetches the history endpoint with the range query param', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      deviceUid: 'plug-1',
      from: '2026-01-01',
      to: '2026-01-02',
      periods: [],
    })
    const controller = new AbortController()

    await getPowerHistory('plug-1', '7d', controller.signal)

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/devices/plug-1/power/history?range=7d',
      controller.signal,
    )
  })
})

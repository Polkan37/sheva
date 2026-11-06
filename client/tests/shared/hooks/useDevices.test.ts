import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api/devices', () => ({
  getDevices: vi.fn(),
}))

import { getDevices, type Device } from '@/shared/api/devices'
import { useDevices } from '@/shared/hooks/useDevices'

function makeDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: '1',
    uid: 'dev-1',
    name: 'Sensor',
    description: null,
    type: 'environment_sensor',
    macAddress: null,
    ipAddress: null,
    room: null,
    sampleIntervalSec: 60,
    firmwareVersion: null,
    lastSeenAt: null,
    online: true,
    ...overrides,
  }
}

describe('useDevices', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts in a loading state with no devices', () => {
    vi.mocked(getDevices).mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useDevices())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.devices).toEqual([])
  })

  it('loads devices and flips isLoading to false', async () => {
    const devices = [makeDevice()]
    vi.mocked(getDevices).mockResolvedValue({ devices })

    const { result } = renderHook(() => useDevices())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.devices).toEqual(devices)
  })

  it('logs and stops loading on a non-abort error, keeping devices empty', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('network down')
    vi.mocked(getDevices).mockRejectedValue(error)

    const { result } = renderHook(() => useDevices())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.devices).toEqual([])
    expect(consoleError).toHaveBeenCalledWith('Failed to load devices:', error)
  })

  it('silently ignores an AbortError without logging', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    vi.mocked(getDevices).mockRejectedValue(abortError)

    const { result } = renderHook(() => useDevices())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('does not flip isLoading when the request settles after unmount', async () => {
    let resolveLoad!: (value: { devices: Device[] }) => void
    vi.mocked(getDevices).mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve
      }),
    )

    const { unmount } = renderHook(() => useDevices())
    unmount()

    resolveLoad({ devices: [makeDevice()] })
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  it('aborts the in-flight request on unmount', () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort')
    vi.mocked(getDevices).mockReturnValue(new Promise(() => {}))

    const { unmount } = renderHook(() => useDevices())
    unmount()

    expect(abortSpy).toHaveBeenCalledTimes(1)
  })
})

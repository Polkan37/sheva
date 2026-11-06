import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api/power', () => ({
  getPowerState: vi.fn(),
}))

import { getPowerState, type PowerState } from '@/shared/api/power'
import { usePowerState } from '@/shared/hooks/usePowerState'

function makeState(overrides: Partial<PowerState> = {}): PowerState {
  return {
    deviceUid: 'plug-1',
    status: 'online',
    since: null,
    lastCheckedAt: null,
    ...overrides,
  }
}

describe('usePowerState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts loading with no state', () => {
    vi.mocked(getPowerState).mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => usePowerState('plug-1'))

    expect(result.current.loading).toBe(true)
    expect(result.current.state).toBeNull()
  })

  it('loads the power state and flips loading to false', async () => {
    const state = makeState()
    vi.mocked(getPowerState).mockResolvedValue(state)

    const { result } = renderHook(() => usePowerState('plug-1'))

    await vi.waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.state).toEqual(state)
    expect(result.current.error).toBeNull()
  })

  it('exposes an Error message on failure', async () => {
    vi.mocked(getPowerState).mockRejectedValue(new Error('offline'))

    const { result } = renderHook(() => usePowerState('plug-1'))

    await vi.waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('offline')
  })

  it('falls back to a generic error message for non-Error rejections', async () => {
    vi.mocked(getPowerState).mockRejectedValue('oops')

    const { result } = renderHook(() => usePowerState('plug-1'))

    await vi.waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Failed to load power state')
  })

  it('polls again after the 60s interval elapses', async () => {
    vi.mocked(getPowerState).mockResolvedValue(makeState())

    renderHook(() => usePowerState('plug-1'))

    await vi.waitFor(() => expect(getPowerState).toHaveBeenCalledTimes(1))

    await vi.advanceTimersByTimeAsync(60_000)
    expect(getPowerState).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(60_000)
    expect(getPowerState).toHaveBeenCalledTimes(3)
  })

  it('resets state and refetches when uid changes', async () => {
    vi.mocked(getPowerState)
      .mockResolvedValueOnce(makeState({ deviceUid: 'plug-1', status: 'online' }))
      .mockResolvedValueOnce(makeState({ deviceUid: 'plug-2', status: 'offline' }))

    const { result, rerender } = renderHook(({ uid }) => usePowerState(uid), {
      initialProps: { uid: 'plug-1' },
    })

    await vi.waitFor(() => expect(result.current.state?.deviceUid).toBe('plug-1'))

    rerender({ uid: 'plug-2' })

    await vi.waitFor(() => expect(result.current.state?.deviceUid).toBe('plug-2'))
    expect(result.current.state?.status).toBe('offline')
  })

  it('ignores a successful response that resolves after the component has unmounted', async () => {
    let resolveLoad!: (value: PowerState) => void
    vi.mocked(getPowerState).mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve
      }),
    )

    const { unmount } = renderHook(() => usePowerState('plug-1'))
    unmount()

    // should not throw / warn even though the request settles post-unmount
    resolveLoad(makeState())
    await vi.advanceTimersByTimeAsync(0)
  })

  it('ignores a rejected response that resolves after the component has unmounted', async () => {
    let rejectLoad!: (reason: unknown) => void
    vi.mocked(getPowerState).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectLoad = reject
      }),
    )

    const { unmount } = renderHook(() => usePowerState('plug-1'))
    unmount()

    rejectLoad(new Error('too late'))
    await vi.advanceTimersByTimeAsync(0)
  })

  it('stops polling and aborts the in-flight request on unmount', async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort')
    vi.mocked(getPowerState).mockResolvedValue(makeState())

    const { unmount } = renderHook(() => usePowerState('plug-1'))
    await vi.waitFor(() => expect(getPowerState).toHaveBeenCalledTimes(1))

    unmount()
    expect(abortSpy).toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(120_000)
    expect(getPowerState).toHaveBeenCalledTimes(1)
  })
})

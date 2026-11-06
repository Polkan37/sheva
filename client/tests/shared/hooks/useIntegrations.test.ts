import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api/integrations', () => ({
  getIntegrations: vi.fn(),
}))

import { getIntegrations } from '@/shared/api/integrations'
import type { Integration } from '@/entities/Integration/types'
import { useIntegrations } from '@/shared/hooks/useIntegrations'

describe('useIntegrations', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts loading with no integrations and no error', () => {
    vi.mocked(getIntegrations).mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useIntegrations())

    expect(result.current.loading).toBe(true)
    expect(result.current.integrations).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('loads integrations and flips loading to false', async () => {
    const integrations = [{ uid: 'yasno' }] as unknown as Integration[]
    vi.mocked(getIntegrations).mockResolvedValue({ integrations })

    const { result } = renderHook(() => useIntegrations())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.integrations).toEqual(integrations)
    expect(result.current.error).toBeNull()
  })

  it('sets an error message on a non-abort failure', async () => {
    vi.mocked(getIntegrations).mockRejectedValue(new Error('network down'))

    const { result } = renderHook(() => useIntegrations())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Failed to load integrations')
  })

  it('ignores AbortError and keeps error null', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    vi.mocked(getIntegrations).mockRejectedValue(abortError)

    const { result } = renderHook(() => useIntegrations())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
  })

  it('does not flip loading when the request settles after unmount', async () => {
    let resolveLoad!: (value: { integrations: Integration[] }) => void
    vi.mocked(getIntegrations).mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve
      }),
    )

    const { unmount } = renderHook(() => useIntegrations())
    unmount()

    resolveLoad({ integrations: [] })
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  it('aborts the in-flight request on unmount', () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort')
    vi.mocked(getIntegrations).mockReturnValue(new Promise(() => {}))

    const { unmount } = renderHook(() => useIntegrations())
    unmount()

    expect(abortSpy).toHaveBeenCalledTimes(1)
  })
})

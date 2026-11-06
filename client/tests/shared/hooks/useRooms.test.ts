import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api/rooms', () => ({
  getRooms: vi.fn(),
}))

import { getRooms, type Room } from '@/shared/api/rooms'
import { useRooms } from '@/shared/hooks/useRooms'

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: '1',
    name: 'Kitchen',
    slug: 'kitchen',
    displayOrder: 0,
    temperature: null,
    humidity: null,
    ...overrides,
  }
}

describe('useRooms', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with an empty list', () => {
    vi.mocked(getRooms).mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useRooms())

    expect(result.current).toEqual([])
  })

  it('populates rooms once the request resolves', async () => {
    const rooms = [makeRoom()]
    vi.mocked(getRooms).mockResolvedValue({ rooms })

    const { result } = renderHook(() => useRooms())

    await waitFor(() => expect(result.current).toEqual(rooms))
  })

  it('logs a non-abort error and leaves rooms empty', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('network down')
    vi.mocked(getRooms).mockRejectedValue(error)

    renderHook(() => useRooms())

    await waitFor(() => expect(consoleError).toHaveBeenCalledWith('Failed to load rooms:', error))
  })

  it('silently ignores an AbortError', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    vi.mocked(getRooms).mockRejectedValue(abortError)

    renderHook(() => useRooms())

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('aborts the in-flight request on unmount', () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort')
    vi.mocked(getRooms).mockReturnValue(new Promise(() => {}))

    const { unmount } = renderHook(() => useRooms())
    unmount()

    expect(abortSpy).toHaveBeenCalledTimes(1)
  })
})

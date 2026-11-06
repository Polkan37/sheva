import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api/client', () => ({
  apiFetch: vi.fn(),
  apiRequest: vi.fn(),
}))

import { apiFetch, apiRequest } from '@/shared/api/client'
import { createRoom, deleteRoom, getRooms, updateRoom } from '@/shared/api/rooms'

describe('rooms api', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('getRooms fetches the rooms endpoint', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ rooms: [] })
    const controller = new AbortController()

    await getRooms(controller.signal)

    expect(apiFetch).toHaveBeenCalledWith('/api/rooms', controller.signal)
  })

  it('createRoom posts the room payload', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined)
    const input = { name: 'Kitchen', slug: 'kitchen', displayOrder: 1 }

    await createRoom(input)

    expect(apiRequest).toHaveBeenCalledWith('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  })

  it('updateRoom patches the room by encoded id', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined)

    await updateRoom('room/1', { name: 'New name' })

    expect(apiRequest).toHaveBeenCalledWith('/api/rooms/room%2F1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New name' }),
    })
  })

  it('deleteRoom issues a DELETE to the room endpoint', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined)

    await deleteRoom('room-1')

    expect(apiRequest).toHaveBeenCalledWith('/api/rooms/room-1', { method: 'DELETE' })
  })
})

import { apiFetch, apiRequest } from './client'

export type Room = {
  id: string
  name: string
  slug: string
  displayOrder: number
  temperature: number | null
  humidity: number | null
}

export type RoomInput = Pick<Room, 'name' | 'slug' | 'displayOrder'>

type RoomsResponse = {
  rooms: Room[]
}

export function getRooms(signal?: AbortSignal) {
  return apiFetch<RoomsResponse>('/api/rooms', signal)
}

export function createRoom(data: RoomInput) {
  return apiRequest<void>('/api/rooms', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateRoom(
  id: string,
  data: Partial<RoomInput>,
) {
  return apiRequest<void>(
    `/api/rooms/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  )
}

export function deleteRoom(id: string) {
  return apiRequest<void>(
    `/api/rooms/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}
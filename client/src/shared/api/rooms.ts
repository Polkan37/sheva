import { apiFetch } from './client'

export type Room = {
  id: string
  name: string
  slug: string
  displayOrder: number
  temperature: number | null
  humidity: number | null
}

type RoomsResponse = {
  rooms: Room[]
}

export function getRooms(signal?: AbortSignal) {
  return apiFetch<RoomsResponse>(
    '/api/rooms',
    signal,
  )
}
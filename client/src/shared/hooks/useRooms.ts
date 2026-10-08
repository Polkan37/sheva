import { useEffect, useState } from 'react'
import { getRooms, type Room } from '../api/rooms'

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([])

  useEffect(() => {
    const controller = new AbortController()

    getRooms(controller.signal)
      .then(({ rooms }) => setRooms(rooms))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Failed to load rooms:', error)
        }
      })

    return () => controller.abort()
  }, [])

  return rooms
}
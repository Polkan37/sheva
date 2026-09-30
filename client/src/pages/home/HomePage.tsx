import { useEffect, useRef, useState } from 'react'
import { Plan} from '../../features/Plan/Plan'
import { Card } from '../../features/Card/Card'
import { getRooms, type Room } from '../../shared/api/rooms'
import { Link } from 'react-router-dom'

export function HomePage() {
  const [activeRoom, setActiveRoom] = useState<string | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const requestController = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    requestController.current = controller

    void getRooms(controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setRooms(response.rooms)
        }
      })
      .catch(() => {
        // Keep the dashboard available if rooms cannot be loaded.
      })
      .finally(() => {
        if (requestController.current === controller) {
          requestController.current = null
        }
      })

    return () => {
      controller.abort()
    }
  }, [])

  return (
    <section className='content'>
          <div className='dashboard'>
            <div className='mainContent container'>
              <Plan
                activeRoom={activeRoom}
                onRoomHover={setActiveRoom}
              />
            </div>

            <aside className='sidebar'>
              {rooms.map((room) => (
                <Link key={room.id} to={`/${room.slug}`}>
                  <Card
                    room={room}
                    active={activeRoom === room.slug}
                    onPointerEnter={() =>
                      setActiveRoom(room.slug)
                    }
                    onPointerLeave={() =>
                      setActiveRoom(null)
                    }
                  />
                </Link>
              ))}
            </aside>
          </div>

          <div className='info'>
            <Card>Weather</Card>
            <Card>Yasno</Card>
            <Card>Air quality</Card>
          </div>
    </section>
  )
}

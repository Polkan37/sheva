import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Plan } from '../../features/Plan/Plan'
import { Card } from '../../features/Card/Card'
import { Integrations } from '../../features/Integrations/Integrations'

import { useRooms } from '../../shared/hooks/useRooms'

export function HomePage() {
  const [activeRoom, setActiveRoom] = useState<string | null>(null);

  const rooms = useRooms();

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

          <Integrations />
    </section>
  )
}

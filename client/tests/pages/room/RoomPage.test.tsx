import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api/rooms', () => ({ getRooms: vi.fn() }))
vi.mock('@/shared/api/devices', () => ({ getDevices: vi.fn() }))
vi.mock('@/features/Integrations/Integrations', () => ({
  Integrations: () => <div>Integrations</div>,
}))
vi.mock('@/features/Devices/DeviceList', () => ({
  DeviceList: ({ devices }: { devices: Array<{ name: string }> }) => (
    <div>DeviceList:{devices.map((d) => d.name).join(',')}</div>
  ),
}))

import { getDevices } from '@/shared/api/devices'
import { getRooms } from '@/shared/api/rooms'
import { makeDevice, makeRoom } from '@tests/factories'
import { RoomPage } from '@/pages/room/RoomPage'

function renderAt(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/${slug}`]}>
      <Routes>
        <Route path="/:slug" element={<RoomPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RoomPage', () => {
  it('shows a loading message before data resolves', () => {
    vi.mocked(getRooms).mockReturnValue(new Promise(() => {}))
    vi.mocked(getDevices).mockReturnValue(new Promise(() => {}))

    renderAt('kitchen')

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows "Room not found" when no room matches the slug', async () => {
    vi.mocked(getRooms).mockResolvedValue({ rooms: [makeRoom({ slug: 'bedroom' })] })
    vi.mocked(getDevices).mockResolvedValue({ devices: [] })

    renderAt('kitchen')

    await waitFor(() => expect(screen.getByText('Room not found')).toBeInTheDocument())
  })

  it('renders only devices belonging to the matched room', async () => {
    const room = makeRoom({ id: 'r1', slug: 'kitchen', name: 'Kitchen' })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [room] })
    vi.mocked(getDevices).mockResolvedValue({
      devices: [
        makeDevice({ name: 'Kitchen sensor', room: { id: 'r1', name: 'Kitchen' } }),
        makeDevice({ name: 'Other room sensor', room: { id: 'r2', name: 'Other' } }),
        makeDevice({ name: 'Unassigned sensor', room: null }),
      ],
    })

    renderAt('kitchen')

    await waitFor(() => expect(screen.getByText(/DeviceList:/)).toBeInTheDocument())
    expect(screen.getByText('DeviceList:Kitchen sensor')).toBeInTheDocument()
    expect(screen.getByText('Integrations')).toBeInTheDocument()
  })

  it('reloads room and device data when the slug changes', async () => {
    vi.mocked(getRooms)
      .mockResolvedValueOnce({ rooms: [makeRoom({ id: 'r1', slug: 'kitchen', name: 'Kitchen' })] })
      .mockResolvedValueOnce({ rooms: [makeRoom({ id: 'r2', slug: 'bedroom', name: 'Bedroom' })] })
    vi.mocked(getDevices).mockResolvedValue({ devices: [] })

    // navigate within a single MemoryRouter instance — remounting a new
    // MemoryRouter with different initialEntries wouldn't change its
    // (construction-time-only) history, so the slug would never actually change
    render(
      <MemoryRouter initialEntries={['/kitchen']}>
        <Routes>
          <Route
            path="/:slug"
            element={
              <>
                <Link to="/bedroom">Go to bedroom</Link>
                <RoomPage />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(getRooms).toHaveBeenCalledTimes(1))

    await userEvent.click(screen.getByText('Go to bedroom'))

    await waitFor(() => expect(getRooms).toHaveBeenCalledTimes(2))
    expect(getDevices).toHaveBeenCalledTimes(2)
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api/devices', () => ({
  getDevices: vi.fn(),
  createDevice: vi.fn(),
  updateDevice: vi.fn(),
  deleteDevice: vi.fn(),
}))
vi.mock('@/shared/api/rooms', () => ({
  getRooms: vi.fn(),
}))
vi.mock('@/shared/hooks/usePowerState', () => ({
  usePowerState: vi.fn(),
}))

import {
  createDevice,
  deleteDevice,
  getDevices,
  updateDevice,
} from '@/shared/api/devices'
import { getRooms } from '@/shared/api/rooms'
import { usePowerState } from '@/shared/hooks/usePowerState'
import { makeDevice, makeRoom } from '@tests/factories'
import { DevicesSettings } from '@/features/Settings/Devices/DevicesSettings'

describe('DevicesSettings', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a loading spinner, then the empty state when there are no devices', async () => {
    vi.mocked(getDevices).mockResolvedValue({ devices: [] })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })

    render(<DevicesSettings />)

    expect(document.querySelector('.spinner')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('No devices added yet')).toBeInTheDocument())
  })

  it('lists devices with room, interval and status', async () => {
    vi.mocked(getDevices).mockResolvedValue({
      devices: [
        makeDevice({
          name: 'Sensor',
          uid: 'dev-1',
          type: 'environment_sensor',
          online: true,
          sampleIntervalSec: 30,
          room: { id: 'r1', name: 'Kitchen' },
        }),
      ],
    })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [makeRoom({ id: 'r1', name: 'Kitchen' })] })

    render(<DevicesSettings />)

    await waitFor(() => expect(screen.getByText('1 devices')).toBeInTheDocument())
    expect(screen.getByText('dev-1 · environment_sensor')).toBeInTheDocument()
    expect(screen.getByText('Kitchen · 30s interval')).toBeInTheDocument()
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('shows "No room" for a device with no assigned room', async () => {
    vi.mocked(getDevices).mockResolvedValue({ devices: [makeDevice({ room: null })] })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })

    render(<DevicesSettings />)

    await waitFor(() => expect(screen.getByText(/No room ·/)).toBeInTheDocument())
  })

  it('delegates status to usePowerState for smart_plug devices', async () => {
    vi.mocked(getDevices).mockResolvedValue({
      devices: [makeDevice({ type: 'smart_plug', uid: 'plug-1' })],
    })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })
    vi.mocked(usePowerState).mockReturnValue({
      state: { deviceUid: 'plug-1', status: 'offline', since: null, lastCheckedAt: null },
      loading: false,
      error: null,
    })

    render(<DevicesSettings />)

    await waitFor(() => expect(screen.getByText('Offline')).toBeInTheDocument())
    expect(usePowerState).toHaveBeenCalledWith('plug-1')
  })

  it('shows an error when the initial load fails', async () => {
    vi.mocked(getDevices).mockRejectedValue(new Error('boom'))
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })

    render(<DevicesSettings />)

    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument())
  })

  it('falls back to a generic error message when the initial load rejects with a non-Error value', async () => {
    vi.mocked(getDevices).mockRejectedValue('nope')
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })

    render(<DevicesSettings />)

    await waitFor(() => expect(screen.getByText('Failed to load devices')).toBeInTheDocument())
  })

  it('does not update state when the initial load resolves after unmount', async () => {
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })
    let resolveLoad!: (value: { devices: ReturnType<typeof makeDevice>[] }) => void
    vi.mocked(getDevices).mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve
      }),
    )

    const { unmount } = render(<DevicesSettings />)
    unmount()

    resolveLoad({ devices: [makeDevice()] })
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  it('does not update state when the initial load rejects after unmount', async () => {
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })
    let rejectLoad!: (reason: unknown) => void
    vi.mocked(getDevices).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectLoad = reject
      }),
    )

    const { unmount } = render(<DevicesSettings />)
    unmount()

    rejectLoad(new Error('too late'))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  it('falls back to a generic error message when saving rejects with a non-Error value', async () => {
    vi.mocked(getDevices).mockResolvedValue({ devices: [] })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })
    vi.mocked(createDevice).mockRejectedValue('nope')

    render(<DevicesSettings />)
    await waitFor(() => expect(screen.getByText('No devices added yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Add device/ }))
    await userEvent.type(screen.getByLabelText('Name'), 'X')
    await userEvent.type(screen.getByLabelText('UID'), 'x')
    await userEvent.type(screen.getByLabelText('Type'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save device' }))

    expect(await screen.findByText('Failed to save device')).toBeInTheDocument()
  })

  it('falls back to a generic error message when deleting rejects with a non-Error value', async () => {
    const device = makeDevice({ id: 'd1', name: 'Sensor' })
    vi.mocked(getDevices).mockResolvedValue({ devices: [device] })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })
    vi.mocked(deleteDevice).mockRejectedValue('nope')

    render(<DevicesSettings />)
    await waitFor(() => expect(screen.getByText('Sensor')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete Sensor' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Failed to delete device')).toBeInTheDocument()
  })

  it('creates a device and reloads the list', async () => {
    vi.mocked(getDevices)
      .mockResolvedValueOnce({ devices: [] })
      .mockResolvedValueOnce({ devices: [makeDevice({ name: 'New device' })] })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })
    vi.mocked(createDevice).mockResolvedValue(undefined)

    render(<DevicesSettings />)
    await waitFor(() => expect(screen.getByText('No devices added yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Add device/ }))
    expect(screen.getByRole('heading', { name: 'Add device' })).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Name'), 'New device')
    await userEvent.type(screen.getByLabelText('UID'), 'dev-x')
    await userEvent.type(screen.getByLabelText('Type'), 'environment_sensor')
    await userEvent.click(screen.getByRole('button', { name: 'Save device' }))

    await waitFor(() => expect(screen.getByText('New device')).toBeInTheDocument())
    expect(createDevice).toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: 'Add device' })).not.toBeInTheDocument()
  })

  it('shows an error and keeps the form open when creating fails', async () => {
    vi.mocked(getDevices).mockResolvedValue({ devices: [] })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })
    vi.mocked(createDevice).mockRejectedValue(new Error('uid taken'))

    render(<DevicesSettings />)
    await waitFor(() => expect(screen.getByText('No devices added yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Add device/ }))
    await userEvent.type(screen.getByLabelText('Name'), 'X')
    await userEvent.type(screen.getByLabelText('UID'), 'x')
    await userEvent.type(screen.getByLabelText('Type'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save device' }))

    expect(await screen.findByText('uid taken')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Add device' })).toBeInTheDocument()
  })

  it('shows a partial-success message when the save worked but the reload failed', async () => {
    vi.mocked(getDevices)
      .mockResolvedValueOnce({ devices: [] })
      .mockRejectedValueOnce(new Error('reload failed'))
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })
    vi.mocked(createDevice).mockResolvedValue(undefined)

    render(<DevicesSettings />)
    await waitFor(() => expect(screen.getByText('No devices added yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Add device/ }))
    await userEvent.type(screen.getByLabelText('Name'), 'X')
    await userEvent.type(screen.getByLabelText('UID'), 'x')
    await userEvent.type(screen.getByLabelText('Type'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save device' }))

    expect(
      await screen.findByText('Device saved, but failed to refresh the list'),
    ).toBeInTheDocument()
  })

  it('edits an existing device via updateDevice', async () => {
    const device = makeDevice({ id: 'd1', name: 'Sensor' })
    vi.mocked(getDevices).mockResolvedValue({ devices: [device] })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })
    vi.mocked(updateDevice).mockResolvedValue(undefined)

    render(<DevicesSettings />)
    await waitFor(() => expect(screen.getByText('Sensor')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Edit Sensor' }))
    expect(screen.getByRole('heading', { name: 'Edit device' })).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Name'))
    await userEvent.type(screen.getByLabelText('Name'), 'Sensor 2')
    await userEvent.click(screen.getByRole('button', { name: 'Save device' }))

    await waitFor(() =>
      expect(updateDevice).toHaveBeenCalledWith('d1', expect.objectContaining({ name: 'Sensor 2' })),
    )
  })

  it('deletes a device after confirming, removing it from the list', async () => {
    const device = makeDevice({ id: 'd1', name: 'Sensor' })
    vi.mocked(getDevices).mockResolvedValue({ devices: [device] })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })
    vi.mocked(deleteDevice).mockResolvedValue(undefined)

    render(<DevicesSettings />)
    await waitFor(() => expect(screen.getByText('Sensor')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete Sensor' }))
    expect(screen.getByText('Delete device?')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText('Sensor')).not.toBeInTheDocument())
    expect(deleteDevice).toHaveBeenCalledWith('d1')
  })

  it('shows an error and keeps the dialog open when deleting fails', async () => {
    const device = makeDevice({ id: 'd1', name: 'Sensor' })
    vi.mocked(getDevices).mockResolvedValue({ devices: [device] })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })
    vi.mocked(deleteDevice).mockRejectedValue(new Error('cannot delete'))

    render(<DevicesSettings />)
    await waitFor(() => expect(screen.getByText('Sensor')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete Sensor' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('cannot delete')).toBeInTheDocument()
    expect(screen.getByText('Sensor')).toBeInTheDocument()
  })

  it('cancels the delete confirmation without deleting', async () => {
    const device = makeDevice({ id: 'd1', name: 'Sensor' })
    vi.mocked(getDevices).mockResolvedValue({ devices: [device] })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })

    render(<DevicesSettings />)
    await waitFor(() => expect(screen.getByText('Sensor')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete Sensor' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByText('Delete device?')).not.toBeInTheDocument()
    expect(deleteDevice).not.toHaveBeenCalled()
  })

  it('closes the create form via Cancel without saving', async () => {
    vi.mocked(getDevices).mockResolvedValue({ devices: [] })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })

    render(<DevicesSettings />)
    await waitFor(() => expect(screen.getByText('No devices added yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Add device/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('heading', { name: 'Add device' })).not.toBeInTheDocument()
    expect(createDevice).not.toHaveBeenCalled()
  })
})

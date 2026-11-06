import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api/rooms', () => ({
  getRooms: vi.fn(),
  createRoom: vi.fn(),
  updateRoom: vi.fn(),
  deleteRoom: vi.fn(),
}))

import { createRoom, deleteRoom, getRooms, updateRoom } from '@/shared/api/rooms'
import { makeRoom } from '@tests/factories'
import { RoomsSettings } from '@/features/Settings/Rooms/RoomsSettings'

describe('RoomsSettings', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a loading spinner, then the empty state when there are no rooms', async () => {
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })

    render(<RoomsSettings />)

    expect(document.querySelector('.spinner')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('No rooms added yet')).toBeInTheDocument())
  })

  it('lists rooms sorted by displayOrder with formatted temperature/humidity', async () => {
    vi.mocked(getRooms).mockResolvedValue({
      rooms: [
        makeRoom({ id: '2', name: 'Second', displayOrder: 2, temperature: null, humidity: null }),
        makeRoom({ id: '1', name: 'First', displayOrder: 1, temperature: 21.46, humidity: 40.2 }),
      ],
    })

    render(<RoomsSettings />)

    await waitFor(() => expect(screen.getByText('2 rooms')).toBeInTheDocument())
    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(names).toEqual(['First', 'Second'])
    expect(screen.getByText('21.5 °C')).toBeInTheDocument()
    expect(screen.getByText('40 %')).toBeInTheDocument()
  })

  it('shows an error when the initial load fails', async () => {
    vi.mocked(getRooms).mockRejectedValue(new Error('network down'))

    render(<RoomsSettings />)

    await waitFor(() => expect(screen.getByText('Failed to load rooms')).toBeInTheDocument())
  })

  it('ignores an AbortError on the initial load without showing an error', async () => {
    vi.mocked(getRooms).mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))

    render(<RoomsSettings />)

    await waitFor(() => expect(screen.queryByText('No rooms added yet')).toBeInTheDocument())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not update state when the initial load settles after unmount', async () => {
    let resolveLoad!: (value: { rooms: ReturnType<typeof makeRoom>[] }) => void
    vi.mocked(getRooms).mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve
      }),
    )

    const { unmount } = render(<RoomsSettings />)
    unmount()

    resolveLoad({ rooms: [makeRoom()] })
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  it('creates a room and reloads the list', async () => {
    vi.mocked(getRooms)
      .mockResolvedValueOnce({ rooms: [] })
      .mockResolvedValueOnce({ rooms: [makeRoom({ name: 'New room' })] })
    vi.mocked(createRoom).mockResolvedValue(undefined)

    render(<RoomsSettings />)
    await waitFor(() => expect(screen.getByText('No rooms added yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Add room/ }))
    expect(screen.getByRole('heading', { name: 'Add room' })).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Name'), 'New room')
    await userEvent.type(screen.getByLabelText('Slug'), 'new-room')
    await userEvent.click(screen.getByRole('button', { name: 'Save room' }))

    await waitFor(() => expect(screen.getByText('New room')).toBeInTheDocument())
    expect(createRoom).toHaveBeenCalledWith({ name: 'New room', slug: 'new-room', displayOrder: 0 })
    expect(screen.queryByRole('heading', { name: 'Add room' })).not.toBeInTheDocument()
  })

  it('shows an error and keeps the form open when creating fails', async () => {
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })
    vi.mocked(createRoom).mockRejectedValue(new Error('slug taken'))

    render(<RoomsSettings />)
    await waitFor(() => expect(screen.getByText('No rooms added yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Add room/ }))
    await userEvent.type(screen.getByLabelText('Name'), 'X')
    await userEvent.type(screen.getByLabelText('Slug'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save room' }))

    expect(await screen.findByText('slug taken')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Add room' })).toBeInTheDocument()
  })

  it('shows a partial-success message when the save worked but the reload failed', async () => {
    vi.mocked(getRooms)
      .mockResolvedValueOnce({ rooms: [] })
      .mockRejectedValueOnce(new Error('reload failed'))
    vi.mocked(createRoom).mockResolvedValue(undefined)

    render(<RoomsSettings />)
    await waitFor(() => expect(screen.getByText('No rooms added yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Add room/ }))
    await userEvent.type(screen.getByLabelText('Name'), 'X')
    await userEvent.type(screen.getByLabelText('Slug'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save room' }))

    expect(
      await screen.findByText('Room saved, but failed to refresh the list'),
    ).toBeInTheDocument()
  })

  it('falls back to a generic error message when saving rejects with a non-Error value', async () => {
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })
    vi.mocked(createRoom).mockRejectedValue('nope')

    render(<RoomsSettings />)
    await waitFor(() => expect(screen.getByText('No rooms added yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Add room/ }))
    await userEvent.type(screen.getByLabelText('Name'), 'X')
    await userEvent.type(screen.getByLabelText('Slug'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save room' }))

    expect(await screen.findByText('Failed to save room')).toBeInTheDocument()
  })

  it('falls back to a generic error message when deleting rejects with a non-Error value', async () => {
    const room = makeRoom({ id: 'r1', name: 'Kitchen' })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [room] })
    vi.mocked(deleteRoom).mockRejectedValue('nope')

    render(<RoomsSettings />)
    await waitFor(() => expect(screen.getByText('Kitchen')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete Kitchen' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Failed to delete room')).toBeInTheDocument()
  })

  it('edits an existing room via updateRoom', async () => {
    const room = makeRoom({ id: 'r1', name: 'Kitchen' })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [room] })
    vi.mocked(updateRoom).mockResolvedValue(undefined)

    render(<RoomsSettings />)
    await waitFor(() => expect(screen.getByText('Kitchen')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Edit Kitchen' }))
    expect(screen.getByText('Edit room')).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Name'))
    await userEvent.type(screen.getByLabelText('Name'), 'Kitchen 2')
    await userEvent.click(screen.getByRole('button', { name: 'Save room' }))

    await waitFor(() => expect(updateRoom).toHaveBeenCalledWith('r1', expect.objectContaining({ name: 'Kitchen 2' })))
  })

  it('deletes a room after confirming, removing it from the list', async () => {
    const room = makeRoom({ id: 'r1', name: 'Kitchen' })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [room] })
    vi.mocked(deleteRoom).mockResolvedValue(undefined)

    render(<RoomsSettings />)
    await waitFor(() => expect(screen.getByText('Kitchen')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete Kitchen' }))
    expect(screen.getByText('Delete room?')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText('Kitchen')).not.toBeInTheDocument())
    expect(deleteRoom).toHaveBeenCalledWith('r1')
  })

  it('shows an error and keeps the dialog open when deleting fails', async () => {
    const room = makeRoom({ id: 'r1', name: 'Kitchen' })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [room] })
    vi.mocked(deleteRoom).mockRejectedValue(new Error('cannot delete'))

    render(<RoomsSettings />)
    await waitFor(() => expect(screen.getByText('Kitchen')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete Kitchen' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('cannot delete')).toBeInTheDocument()
    expect(screen.getByText('Kitchen')).toBeInTheDocument()
  })

  it('cancels the delete confirmation without deleting', async () => {
    const room = makeRoom({ id: 'r1', name: 'Kitchen' })
    vi.mocked(getRooms).mockResolvedValue({ rooms: [room] })

    render(<RoomsSettings />)
    await waitFor(() => expect(screen.getByText('Kitchen')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete Kitchen' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByText('Delete room?')).not.toBeInTheDocument()
    expect(deleteRoom).not.toHaveBeenCalled()
  })

  it('closes the create form via Cancel without saving', async () => {
    vi.mocked(getRooms).mockResolvedValue({ rooms: [] })

    render(<RoomsSettings />)
    await waitFor(() => expect(screen.getByText('No rooms added yet')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Add room/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('heading', { name: 'Add room' })).not.toBeInTheDocument()
    expect(createRoom).not.toHaveBeenCalled()
  })
})

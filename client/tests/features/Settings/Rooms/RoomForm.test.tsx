import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { makeRoom } from '@tests/factories'
import { RoomForm } from '@/features/Settings/Rooms/RoomForm'

describe('RoomForm', () => {
  it('shows "Add room" and defaults displayOrder when there is no room', () => {
    render(
      <RoomForm room={null} defaultOrder={3} isSaving={false} error={null} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getByText('Add room')).toBeInTheDocument()
    expect(screen.getByLabelText('Display order')).toHaveValue(3)
  })

  it('shows "Edit room" and pre-fills fields from the room', () => {
    render(
      <RoomForm
        room={makeRoom({ name: 'Kitchen', slug: 'kitchen', displayOrder: 2 })}
        defaultOrder={5}
        isSaving={false}
        error={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Edit room')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Kitchen')
    expect(screen.getByLabelText('Slug')).toHaveValue('kitchen')
    expect(screen.getByLabelText('Display order')).toHaveValue(2)
  })

  it('trims name and slug and submits displayOrder as a number', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <RoomForm room={null} defaultOrder={0} isSaving={false} error={null} onSave={onSave} onClose={vi.fn()} />,
    )

    await userEvent.type(screen.getByLabelText('Name'), '  Bathroom  ')
    await userEvent.type(screen.getByLabelText('Slug'), '  bathroom  ')
    await userEvent.clear(screen.getByLabelText('Display order'))
    await userEvent.type(screen.getByLabelText('Display order'), '4')

    await userEvent.click(screen.getByRole('button', { name: 'Save room' }))

    expect(onSave).toHaveBeenCalledWith({ name: 'Bathroom', slug: 'bathroom', displayOrder: 4 })
  })

  it('does not submit while isSaving is true', async () => {
    const onSave = vi.fn()
    render(
      <RoomForm room={null} defaultOrder={0} isSaving error={null} onSave={onSave} onClose={vi.fn()} />,
    )

    const form = screen.getByRole('button', { name: 'Saving...' }).closest('form') as HTMLFormElement
    // fireEvent bypasses native required-field validation, which a real
    // requestSubmit() would otherwise block before the handler ever runs
    fireEvent.submit(form)

    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    render(
      <RoomForm room={null} defaultOrder={0} isSaving={false} error={null} onSave={vi.fn()} onClose={onClose} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders the error message when present', () => {
    render(
      <RoomForm
        room={null}
        defaultOrder={0}
        isSaving={false}
        error="Slug already exists"
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Slug already exists')
  })
})

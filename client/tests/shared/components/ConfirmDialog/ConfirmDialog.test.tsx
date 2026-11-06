import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmDialog } from '@/shared/components/ConfirmDialog/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders the title and message', () => {
    render(
      <ConfirmDialog
        title="Delete room?"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByText('Delete room?')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('does not render an error message when none is given', () => {
    render(
      <ConfirmDialog
        title="t"
        message="m"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders an error message when provided', () => {
    render(
      <ConfirmDialog
        title="t"
        message="m"
        error="Something went wrong"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
  })

  it('calls onConfirm when the Delete button is clicked', async () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog title="t" message="m" onConfirm={onConfirm} onCancel={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when the Cancel button is clicked', async () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog title="t" message="m" onConfirm={vi.fn()} onCancel={onCancel} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel (via the modal) when Escape is pressed and not loading', async () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog title="t" message="m" onConfirm={vi.fn()} onCancel={onCancel} />,
    )

    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows a loading label and disables both buttons while isLoading', () => {
    render(
      <ConfirmDialog
        title="t"
        message="m"
        isLoading
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})

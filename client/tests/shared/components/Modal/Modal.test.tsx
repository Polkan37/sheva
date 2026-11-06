import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Modal } from '@/shared/components/Modal/Modal'

describe('Modal', () => {
  it('renders the title and children into a portal attached to document.body', () => {
    const { container } = render(
      <Modal title="My title" onClose={vi.fn()}>
        <p>dialog body</p>
      </Modal>,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('My title')).toBeInTheDocument()
    expect(screen.getByText('dialog body')).toBeInTheDocument()
    // rendered via a portal, so it must live outside RTL's own render container
    expect(container.contains(dialog)).toBe(false)
    expect(document.body.contains(dialog)).toBe(true)
  })

  it('has correct dialog accessibility attributes linked to the title', () => {
    render(
      <Modal title="Accessible title" onClose={vi.fn()}>
        content
      </Modal>,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(document.getElementById(labelledBy as string)).toHaveTextContent('Accessible title')
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(
      <Modal title="t" onClose={onClose}>
        content
      </Modal>,
    )

    await userEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn()
    render(
      <Modal title="t" onClose={onClose}>
        content
      </Modal>,
    )

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores other key presses', async () => {
    const onClose = vi.fn()
    render(
      <Modal title="t" onClose={onClose}>
        content
      </Modal>,
    )

    await userEvent.keyboard('{Enter}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('disables the close button and ignores Escape when disabled', async () => {
    const onClose = vi.fn()
    render(
      <Modal title="t" onClose={onClose} disabled>
        content
      </Modal>,
    )

    expect(screen.getByLabelText('Close')).toBeDisabled()

    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('removes the keydown listener on unmount', async () => {
    const onClose = vi.fn()
    const { unmount } = render(
      <Modal title="t" onClose={onClose}>
        content
      </Modal>,
    )

    unmount()
    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('re-binds the Escape handler when the disabled prop changes', async () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <Modal title="t" onClose={onClose} disabled>
        content
      </Modal>,
    )

    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()

    rerender(
      <Modal title="t" onClose={onClose} disabled={false}>
        content
      </Modal>,
    )

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

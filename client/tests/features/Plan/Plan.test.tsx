import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Plan } from '@/features/Plan/Plan'

describe('Plan', () => {
  it('calls onRoomHover with the room id when hovering a room path', async () => {
    const onRoomHover = vi.fn()
    const { container } = render(<Plan activeRoom={null} onRoomHover={onRoomHover} />)

    const kitchenPath = container.querySelector('#room-kitchen') as HTMLElement
    await userEvent.hover(kitchenPath)

    expect(onRoomHover).toHaveBeenCalledWith('kitchen')
  })

  it('calls onRoomHover with null when the pointer leaves a room path', async () => {
    const onRoomHover = vi.fn()
    const { container } = render(<Plan activeRoom={null} onRoomHover={onRoomHover} />)

    const kitchenPath = container.querySelector('#room-kitchen') as HTMLElement
    await userEvent.hover(kitchenPath)
    await userEvent.unhover(kitchenPath)

    expect(onRoomHover).toHaveBeenLastCalledWith(null)
  })

  it('applies the active class only to the matching room path', () => {
    const { container } = render(<Plan activeRoom="bedroom" onRoomHover={vi.fn()} />)

    const bedroomPath = container.querySelector('#room-bedroom') as SVGPathElement
    const kitchenPath = container.querySelector('#room-kitchen') as SVGPathElement

    expect(bedroomPath.getAttribute('class')).toContain('roomActive')
    expect(kitchenPath.getAttribute('class')).not.toContain('roomActive')
  })

  it('renders every interactive room region', () => {
    const { container } = render(<Plan activeRoom={null} onRoomHover={vi.fn()} />)

    for (const room of ['living-room', 'bedroom', 'kitchen', 'hall', 'wc', 'bathroom', 'balcony']) {
      expect(container.querySelector(`#room-${room}`)).toBeInTheDocument()
    }
  })
})

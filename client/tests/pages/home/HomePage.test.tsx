import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/hooks/useRooms', () => ({ useRooms: vi.fn() }))
vi.mock('@/features/Integrations/Integrations', () => ({
  Integrations: () => <div>Integrations</div>,
}))

import { useRooms } from '@/shared/hooks/useRooms'
import { makeRoom } from '@tests/factories'
import { HomePage } from '@/pages/home/HomePage'

describe('HomePage', () => {
  it('renders a card and sidebar link for each room, plus the floor plan and integrations', () => {
    vi.mocked(useRooms).mockReturnValue([
      makeRoom({ id: '1', slug: 'kitchen', name: 'Kitchen' }),
    ])

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    // "Kitchen" also appears as a static label in the floor plan SVG, so assert
    // on the sidebar link specifically rather than the ambiguous text alone
    expect(screen.getByRole('link', { name: /Kitchen/ })).toHaveAttribute('href', '/kitchen')
    expect(screen.getByRole('img', { name: 'Apartment floor plan' })).toBeInTheDocument()
    expect(screen.getByText('Integrations')).toBeInTheDocument()
  })

  it('activates the plan room and card when hovering the room card', async () => {
    vi.mocked(useRooms).mockReturnValue([
      makeRoom({ id: '1', slug: 'kitchen', name: 'Kitchen' }),
    ])

    const { container } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    const card = screen.getByRole('link', { name: /Kitchen/ }).querySelector('div') as HTMLElement
    await userEvent.hover(card)

    const kitchenPlanRegion = container.querySelector('#room-kitchen') as SVGPathElement
    expect(kitchenPlanRegion.getAttribute('class')).toContain('roomActive')

    await userEvent.unhover(card)
    expect(kitchenPlanRegion.getAttribute('class')).not.toContain('roomActive')
  })

  it('renders no room cards when there are no rooms', () => {
    vi.mocked(useRooms).mockReturnValue([])

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

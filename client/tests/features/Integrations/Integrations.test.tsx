import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/hooks/useIntegrations', () => ({
  useIntegrations: vi.fn(),
}))

vi.mock('@/features/Integrations/config', () => ({
  integrationConfig: {
    yasno: {
      Card: ({ integration }: { integration: { uid: string } }) => (
        <div>Card:{integration.uid}</div>
      ),
    },
    ukrhmc: {
      Card: ({ integration }: { integration: { uid: string } }) => (
        <div>Card:{integration.uid}</div>
      ),
    },
  },
}))

import { useIntegrations } from '@/shared/hooks/useIntegrations'
import { Integrations } from '@/features/Integrations/Integrations'

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <Integrations />
    </MemoryRouter>,
  )
}

describe('Integrations', () => {
  it('renders yasno before ukrhmc regardless of the order returned by the hook', () => {
    vi.mocked(useIntegrations).mockReturnValue({
      integrations: [{ id: '2', uid: 'ukrhmc' }, { id: '1', uid: 'yasno' }] as never,
      loading: false,
      error: null,
    })

    renderWithRouter()

    const cards = screen.getAllByText(/^Card:/)
    expect(cards.map((el) => el.textContent)).toEqual(['Card:yasno', 'Card:ukrhmc'])
  })

  it('skips integrations without a matching config entry', () => {
    vi.mocked(useIntegrations).mockReturnValue({
      integrations: [
        { id: '1', uid: 'yasno' },
        { id: '3', uid: 'unknown-provider' },
      ] as never,
      loading: false,
      error: null,
    })

    renderWithRouter()

    expect(screen.getAllByText(/^Card:/)).toHaveLength(1)
  })

  it('links each card to its integration detail page', () => {
    vi.mocked(useIntegrations).mockReturnValue({
      integrations: [{ id: '1', uid: 'yasno' }] as never,
      loading: false,
      error: null,
    })

    renderWithRouter()

    expect(screen.getByRole('link')).toHaveAttribute('href', '/integrations/yasno')
  })

  it('renders nothing when there are no integrations', () => {
    vi.mocked(useIntegrations).mockReturnValue({ integrations: [], loading: false, error: null })

    const { container } = renderWithRouter()

    expect(container.querySelector('.integrations')?.children.length).toBe(0)
  })
})

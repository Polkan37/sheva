import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/hooks/useIntegrations', () => ({ useIntegrations: vi.fn() }))
vi.mock('@/features/Integrations/config', () => ({
  integrationConfig: {
    yasno: {
      Page: ({ integration }: { integration: { uid: string } }) => (
        <div>YasnoPage:{integration.uid}</div>
      ),
    },
  },
}))

import { useIntegrations } from '@/shared/hooks/useIntegrations'
import { IntegrationPage } from '@/pages/integrations/IntegrationPage'

function renderAt(uid: string) {
  return render(
    <MemoryRouter initialEntries={[`/integrations/${uid}`]}>
      <Routes>
        <Route path="/integrations/:uid" element={<IntegrationPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('IntegrationPage', () => {
  it('shows a spinner while loading', () => {
    vi.mocked(useIntegrations).mockReturnValue({ integrations: [], loading: true, error: null })

    renderAt('yasno')

    expect(document.querySelector('.spinner')).toBeInTheDocument()
  })

  it('shows the error message when loading fails', () => {
    vi.mocked(useIntegrations).mockReturnValue({
      integrations: [],
      loading: false,
      error: 'Failed to load integrations',
    })

    renderAt('yasno')

    expect(screen.getByText('Failed to load integrations')).toBeInTheDocument()
  })

  it('shows "Integration not found" when no integration matches the uid', () => {
    vi.mocked(useIntegrations).mockReturnValue({ integrations: [], loading: false, error: null })

    renderAt('missing')

    expect(screen.getByText('Integration not found')).toBeInTheDocument()
  })

  it('shows "Integration config not found" when there is no config for the uid', () => {
    vi.mocked(useIntegrations).mockReturnValue({
      integrations: [{ id: '1', uid: 'ukrhmc' }] as never,
      loading: false,
      error: null,
    })

    renderAt('ukrhmc')

    expect(screen.getByText('Integration config not found')).toBeInTheDocument()
  })

  it('renders the matching integration Page component', () => {
    vi.mocked(useIntegrations).mockReturnValue({
      integrations: [{ id: '1', uid: 'yasno' }] as never,
      loading: false,
      error: null,
    })

    renderAt('yasno')

    expect(screen.getByText('YasnoPage:yasno')).toBeInTheDocument()
  })
})

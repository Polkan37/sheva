import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/Header/Header', () => ({ Header: () => <div>Header</div> }))
vi.mock('@/pages/home/HomePage', () => ({ HomePage: () => <div>HomePage</div> }))
vi.mock('@/pages/devices/DevicesPage', () => ({ DevicesPage: () => <div>DevicesPage</div> }))
vi.mock('@/pages/room/RoomPage', () => ({ RoomPage: () => <div>RoomPage</div> }))
vi.mock('@/pages/settings/SettingsPage', () => ({ SettingsPage: () => <div>SettingsPage</div> }))
vi.mock('@/pages/integrations/IntegrationPage', () => ({
  IntegrationPage: () => <div>IntegrationPage</div>,
}))

import App from '@/App'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App', () => {
  it('always renders the Header', () => {
    renderAt('/')
    expect(screen.getByText('Header')).toBeInTheDocument()
  })

  it('renders HomePage at /', () => {
    renderAt('/')
    expect(screen.getByText('HomePage')).toBeInTheDocument()
  })

  it('renders DevicesPage at /devices', () => {
    renderAt('/devices')
    expect(screen.getByText('DevicesPage')).toBeInTheDocument()
  })

  it('renders SettingsPage at /settings', () => {
    renderAt('/settings')
    expect(screen.getByText('SettingsPage')).toBeInTheDocument()
  })

  it('renders IntegrationPage at /integrations/:uid', () => {
    renderAt('/integrations/yasno')
    expect(screen.getByText('IntegrationPage')).toBeInTheDocument()
  })

  it('renders RoomPage for an arbitrary slug', () => {
    renderAt('/kitchen')
    expect(screen.getByText('RoomPage')).toBeInTheDocument()
  })
})

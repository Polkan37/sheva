import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/Settings/Rooms/RoomsSettings', () => ({
  RoomsSettings: () => <div>RoomsSettings</div>,
}))
vi.mock('@/features/Settings/Devices/DevicesSettings', () => ({
  DevicesSettings: () => <div>DevicesSettings</div>,
}))
vi.mock('@/features/Settings/Integrations/IntegrationsSettings', () => ({
  IntegrationsSettings: () => <div>IntegrationsSettings</div>,
}))

import { SettingsPage } from '@/pages/settings/SettingsPage'

describe('SettingsPage', () => {
  it('renders the heading and all three settings sections', () => {
    render(<SettingsPage />)

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText('RoomsSettings')).toBeInTheDocument()
    expect(screen.getByText('DevicesSettings')).toBeInTheDocument()
    expect(screen.getByText('IntegrationsSettings')).toBeInTheDocument()
  })
})

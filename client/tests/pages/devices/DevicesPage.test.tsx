import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/hooks/useDevices', () => ({ useDevices: vi.fn() }))
vi.mock('@/features/Devices/DeviceList', () => ({
  DeviceList: ({ devices }: { devices: Array<{ name: string }> }) => (
    <div>DeviceList:{devices.map((d) => d.name).join(',')}</div>
  ),
}))
vi.mock('@/features/Devices/DevicePageList', () => ({
  DevicePageList: ({ device }: { device: { name: string } }) => (
    <div>DevicePageList:{device.name}</div>
  ),
}))

import { useDevices } from '@/shared/hooks/useDevices'
import { makeDevice } from '@tests/factories'
import { DevicesPage } from '@/pages/devices/DevicesPage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DevicesPage />
    </MemoryRouter>,
  )
}

describe('DevicesPage', () => {
  it('shows a loading message while devices are loading', () => {
    vi.mocked(useDevices).mockReturnValue({ devices: [], isLoading: true })

    renderAt('/devices')

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('prompts to select a device when none is selected', () => {
    vi.mocked(useDevices).mockReturnValue({
      devices: [makeDevice({ uid: 'dev-1' })],
      isLoading: false,
    })

    renderAt('/devices')

    expect(screen.getByText('Select a device ➡')).toBeInTheDocument()
    expect(screen.getByText('DeviceList:Living room sensor')).toBeInTheDocument()
  })

  it('renders the selected device matching the uid search param', () => {
    vi.mocked(useDevices).mockReturnValue({
      devices: [makeDevice({ uid: 'dev-1', name: 'Sensor one' })],
      isLoading: false,
    })

    renderAt('/devices?uid=dev-1')

    expect(screen.getByText('DevicePageList:Sensor one')).toBeInTheDocument()
  })

  it('prompts to select when the uid search param matches no device', () => {
    vi.mocked(useDevices).mockReturnValue({
      devices: [makeDevice({ uid: 'dev-1' })],
      isLoading: false,
    })

    renderAt('/devices?uid=missing')

    expect(screen.getByText('Select a device ➡')).toBeInTheDocument()
  })
})

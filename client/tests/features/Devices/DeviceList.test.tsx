import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { makeDevice } from '@tests/factories'
import { DeviceList } from '@/features/Devices/DeviceList'

function renderWithRouter(devices: ReturnType<typeof makeDevice>[], initialPath = '/devices') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <DeviceList devices={devices} />
    </MemoryRouter>,
  )
}

describe('DeviceList', () => {
  it('renders an environment sensor using the THHome card', () => {
    renderWithRouter([makeDevice({ type: 'environment_sensor', name: 'Sensor A' })])
    expect(screen.getByText('Sensor A')).toBeInTheDocument()
  })

  it('renders a smart plug using the SmartPlug card', () => {
    renderWithRouter([makeDevice({ type: 'smart_plug', name: 'Plug A' })])
    expect(screen.getByText('Plug A')).toBeInTheDocument()
  })

  it('renders an unrecognized device type using the default DeviceCard', () => {
    renderWithRouter([makeDevice({ type: 'unknown_type', name: 'Mystery device' })])
    expect(screen.getByText('Mystery device')).toBeInTheDocument()
  })

  it('links each device to its detail URL by uid', () => {
    renderWithRouter([makeDevice({ uid: 'dev-42', name: 'Device 42' })])

    const link = screen.getByRole('link', { name: /Device 42/ })
    expect(link).toHaveAttribute('href', '/devices?uid=dev-42')
  })

  it('marks the device matching the uid search param as active', () => {
    renderWithRouter(
      [makeDevice({ uid: 'dev-42', name: 'Device 42' })],
      '/devices?uid=dev-42',
    )

    const link = screen.getByRole('link', { name: /Device 42/ })
    expect(link.className).toContain('active')
  })

  it('does not mark a non-matching device as active', () => {
    renderWithRouter(
      [makeDevice({ uid: 'dev-42', name: 'Device 42' })],
      '/devices?uid=other',
    )

    const link = screen.getByRole('link', { name: /Device 42/ })
    expect(link.className).toBe('')
  })

  it('renders nothing when the devices list is empty', () => {
    const { container } = renderWithRouter([])
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })
})

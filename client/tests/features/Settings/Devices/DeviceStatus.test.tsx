import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/hooks/usePowerState', () => ({
  usePowerState: vi.fn(),
}))

import { usePowerState } from '@/shared/hooks/usePowerState'
import { makeDevice, makePowerState } from '@tests/factories'
import { DeviceStatus } from '@/features/Settings/Devices/DeviceStatus'

describe('DeviceStatus', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders Online/Offline straight from device.online for non smart-plug devices', () => {
    const { rerender } = render(
      <DeviceStatus device={makeDevice({ type: 'environment_sensor', online: true })} />,
    )
    expect(screen.getByText('Online')).toBeInTheDocument()

    rerender(<DeviceStatus device={makeDevice({ type: 'environment_sensor', online: false })} />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('delegates to usePowerState for smart_plug devices', () => {
    vi.mocked(usePowerState).mockReturnValue({
      state: makePowerState({ status: 'offline' }),
      loading: false,
      error: null,
    })

    render(<DeviceStatus device={makeDevice({ type: 'smart_plug', uid: 'plug-9' })} />)

    expect(usePowerState).toHaveBeenCalledWith('plug-9')
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('shows Unknown for a smart plug when usePowerState reports an error', () => {
    vi.mocked(usePowerState).mockReturnValue({ state: null, loading: false, error: 'boom' })

    render(<DeviceStatus device={makeDevice({ type: 'smart_plug' })} />)

    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('shows Unknown for a smart plug before state has loaded', () => {
    vi.mocked(usePowerState).mockReturnValue({ state: null, loading: true, error: null })

    render(<DeviceStatus device={makeDevice({ type: 'smart_plug' })} />)

    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/hooks/usePowerState', () => ({
  usePowerState: vi.fn(),
}))

import { usePowerState } from '@/shared/hooks/usePowerState'
import { makeDevice, makePowerState } from '@tests/factories'
import { SmartPlugCard } from '@/features/Devices/SmartPlug/Card'

describe('SmartPlugCard', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('shows the online status in green', () => {
    vi.mocked(usePowerState).mockReturnValue({
      state: makePowerState({ status: 'online' }),
      loading: false,
      error: null,
    })

    render(<SmartPlugCard device={makeDevice({ name: 'Plug' })} />)

    const statusEl = screen.getByTitle('Power status')
    expect(statusEl).toHaveTextContent('Online')
    expect(statusEl.className).toContain('green-text')
  })

  it('shows the offline status in red', () => {
    vi.mocked(usePowerState).mockReturnValue({
      state: makePowerState({ status: 'offline' }),
      loading: false,
      error: null,
    })

    render(<SmartPlugCard device={makeDevice()} />)

    const statusEl = screen.getByTitle('Power status')
    expect(statusEl).toHaveTextContent('Offline')
    expect(statusEl.className).toContain('red-text')
  })

  it('falls back to unknown (no color class) when there is an error', () => {
    vi.mocked(usePowerState).mockReturnValue({ state: null, loading: false, error: 'boom' })

    render(<SmartPlugCard device={makeDevice()} />)

    const statusEl = screen.getByTitle('Power status')
    expect(statusEl).toHaveTextContent('Unknown')
    expect(statusEl.className).not.toContain('red-text')
    expect(statusEl.className).not.toContain('green-text')
  })

  it('falls back to unknown when state has not loaded yet', () => {
    vi.mocked(usePowerState).mockReturnValue({ state: null, loading: true, error: null })

    render(<SmartPlugCard device={makeDevice()} />)

    expect(screen.getByTitle('Power status')).toHaveTextContent('Unknown')
  })

  it('renders the description when present', () => {
    vi.mocked(usePowerState).mockReturnValue({
      state: makePowerState(),
      loading: false,
      error: null,
    })

    render(<SmartPlugCard device={makeDevice({ description: 'Behind the TV' })} />)

    expect(screen.getByText('Behind the TV')).toBeInTheDocument()
  })
})

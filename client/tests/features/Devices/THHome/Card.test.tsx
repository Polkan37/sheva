import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/hooks/useMeasurements', () => ({
  useMeasurements: vi.fn(),
}))

import { useMeasurements } from '@/shared/hooks/useMeasurements'
import { makeDevice, makeMeasurement } from '@tests/factories'
import { THHomeCard } from '@/features/Devices/THHome/Card'

describe('THHomeCard', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('shows dashes for every metric while there is no measurement', () => {
    vi.mocked(useMeasurements).mockReturnValue({ measurement: null, loading: true, error: null })

    render(<THHomeCard device={makeDevice({ name: 'Bedroom sensor' })} />)

    expect(screen.getByText('Bedroom sensor')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(3)
  })

  it('renders temperature, humidity and battery from the measurement', () => {
    vi.mocked(useMeasurements).mockReturnValue({
      measurement: makeMeasurement({ temperatureC: 22.56, humidityPct: 48.4, batteryPct: 73 }),
      loading: false,
      error: null,
    })

    render(<THHomeCard device={makeDevice()} />)

    expect(screen.getByText('22.6 °C')).toBeInTheDocument()
    expect(screen.getByText('48%')).toBeInTheDocument()
    expect(screen.getByText('73%')).toBeInTheDocument()
  })

  it('shows a dash for battery when batteryPct is null', () => {
    vi.mocked(useMeasurements).mockReturnValue({
      measurement: makeMeasurement({ batteryPct: null }),
      loading: false,
      error: null,
    })

    render(<THHomeCard device={makeDevice()} />)

    const batteryStat = screen.getByTitle('battery')
    expect(batteryStat).toHaveTextContent('—')
  })

  it('marks low battery (<=17%) with the low-battery styling and title', () => {
    vi.mocked(useMeasurements).mockReturnValue({
      measurement: makeMeasurement({ batteryPct: 15 }),
      loading: false,
      error: null,
    })

    render(<THHomeCard device={makeDevice()} />)

    const batteryStat = screen.getByTitle('low battery')
    expect(batteryStat.className).toContain('red-text')
  })

  it('does not mark battery as low above the threshold', () => {
    vi.mocked(useMeasurements).mockReturnValue({
      measurement: makeMeasurement({ batteryPct: 18 }),
      loading: false,
      error: null,
    })

    render(<THHomeCard device={makeDevice()} />)

    const batteryStat = screen.getByTitle('battery')
    expect(batteryStat.className).not.toContain('red-text')
  })

  it('renders the description when present', () => {
    vi.mocked(useMeasurements).mockReturnValue({ measurement: null, loading: true, error: null })

    render(<THHomeCard device={makeDevice({ description: 'Near the window' })} />)

    expect(screen.getByText('Near the window')).toBeInTheDocument()
  })
})

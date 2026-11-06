import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChartOptions } from 'chart.js'

const lineCalls: Array<{ options: ChartOptions<'line'> }> = []

vi.mock('react-chartjs-2', () => ({
  Line: (props: { options: ChartOptions<'line'> }) => {
    lineCalls.push(props)
    return <div data-testid="line-chart" />
  },
}))
vi.mock('@/shared/hooks/useMeasurements', () => ({
  useMeasurements: vi.fn(),
}))
vi.mock('@/shared/api/analytics', () => ({
  getDeviceAnalytics: vi.fn(),
}))

import { getDeviceAnalytics, type AnalyticsResponse } from '@/shared/api/analytics'
import { useMeasurements } from '@/shared/hooks/useMeasurements'
import { makeDevice, makeMeasurement } from '@tests/factories'
import { THHomePage } from '@/features/Devices/THHome/Page'

function makeAnalytics(overrides: Partial<AnalyticsResponse> = {}): AnalyticsResponse {
  return {
    deviceUid: 'dev-1',
    period: { from: '2026-01-14T00:00:00Z', to: '2026-01-15T00:00:00Z' },
    resolutionSec: 300,
    requestedPoints: 200,
    returnedPoints: 0,
    summary: {
      samples: 0,
      temperatureC: { avg: null, min: null, max: null },
      humidityPct: { avg: null, min: null, max: null },
      batteryVoltage: { avg: null, min: null, max: null },
      batteryPct: { avg: null, min: null, max: null },
      rssiDbm: { avg: null, min: null, max: null },
    },
    data: [],
    ...overrides,
  }
}

describe('THHomePage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows "Loading analytics..." before analytics resolves', () => {
    vi.mocked(useMeasurements).mockReturnValue({ measurement: null, loading: true, error: null })
    vi.mocked(getDeviceAnalytics).mockReturnValue(new Promise(() => {}))

    render(<THHomePage device={makeDevice()} />)

    expect(screen.getByText('Loading analytics...')).toBeInTheDocument()
  })

  it('renders device info and online/offline status', () => {
    vi.mocked(useMeasurements).mockReturnValue({ measurement: null, loading: true, error: null })
    vi.mocked(getDeviceAnalytics).mockReturnValue(new Promise(() => {}))

    render(
      <THHomePage
        device={makeDevice({
          name: 'Bedroom sensor',
          description: 'Mounted near the window',
          online: false,
          firmwareVersion: '2.1.0',
          sampleIntervalSec: 30,
          room: { id: '1', name: 'Bedroom' },
        })}
      />,
    )

    expect(screen.getByText('Bedroom sensor')).toBeInTheDocument()
    expect(screen.getByText('Mounted near the window')).toBeInTheDocument()
    expect(screen.getByText('Bedroom')).toBeInTheDocument()
    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.getByText('2.1.0')).toBeInTheDocument()
    expect(screen.getByText('30s')).toBeInTheDocument()
  })

  it('shows "No measurements available." when loading finished with none', () => {
    vi.mocked(useMeasurements).mockReturnValue({ measurement: null, loading: false, error: null })
    vi.mocked(getDeviceAnalytics).mockReturnValue(new Promise(() => {}))

    render(<THHomePage device={makeDevice()} />)

    expect(screen.getByText('No measurements available.')).toBeInTheDocument()
  })

  it('renders the latest measurement with low-battery styling at or below 17%', () => {
    vi.mocked(useMeasurements).mockReturnValue({
      measurement: makeMeasurement({ temperatureC: 19.2, humidityPct: 55, batteryPct: 10, batteryVoltage: 2.95 }),
      loading: false,
      error: null,
    })
    vi.mocked(getDeviceAnalytics).mockReturnValue(new Promise(() => {}))

    render(<THHomePage device={makeDevice()} />)

    expect(screen.getByText('19.2°C')).toBeInTheDocument()
    expect(screen.getByText('55%')).toBeInTheDocument()
    expect(screen.getByText('Low Battery')).toBeInTheDocument()
    expect(screen.getByText('2.95 V')).toBeInTheDocument()
  })

  it('shows a plain "Battery" label and dash voltage above the low-battery threshold / when null', () => {
    vi.mocked(useMeasurements).mockReturnValue({
      measurement: makeMeasurement({ batteryPct: 50, batteryVoltage: null }),
      loading: false,
      error: null,
    })
    vi.mocked(getDeviceAnalytics).mockReturnValue(new Promise(() => {}))

    render(<THHomePage device={makeDevice()} />)

    expect(screen.getByText('Battery')).toBeInTheDocument()
    expect(screen.getByText('— V')).toBeInTheDocument()
  })

  it('shows a dash for battery percent when null', () => {
    vi.mocked(useMeasurements).mockReturnValue({
      measurement: makeMeasurement({ batteryPct: null }),
      loading: false,
      error: null,
    })
    vi.mocked(getDeviceAnalytics).mockReturnValue(new Promise(() => {}))

    render(<THHomePage device={makeDevice()} />)

    expect(screen.getByText('Battery')).toBeInTheDocument()
  })

  it('shows the last-seen timestamp when the device has reported in', () => {
    vi.mocked(useMeasurements).mockReturnValue({ measurement: null, loading: true, error: null })
    vi.mocked(getDeviceAnalytics).mockReturnValue(new Promise(() => {}))

    render(<THHomePage device={makeDevice({ lastSeenAt: '2026-01-15T12:00:00Z' })} />)

    expect(screen.queryByText('Never')).not.toBeInTheDocument()
  })

  it('renders analytics summary, charts and footer once analytics resolve', async () => {
    lineCalls.length = 0
    vi.mocked(useMeasurements).mockReturnValue({ measurement: null, loading: true, error: null })
    vi.mocked(getDeviceAnalytics).mockResolvedValue(
      makeAnalytics({
        returnedPoints: 2,
        resolutionSec: 600,
        summary: {
          samples: 2,
          temperatureC: { avg: 21.23, min: 20, max: 22 },
          humidityPct: { avg: 44.5, min: 40, max: 48 },
          batteryVoltage: { avg: null, min: null, max: null },
          batteryPct: { avg: null, min: null, max: null },
          rssiDbm: { avg: null, min: null, max: null },
        },
        data: [
          {
            timestamp: '2026-01-14T12:00:00Z',
            samples: 1,
            temperatureC: { avg: 21, min: 21, max: 21 },
            humidityPct: { avg: 44, min: 44, max: 44 },
            batteryVoltage: { avg: null, min: null, max: null },
            batteryPct: { avg: null, min: null, max: null },
            rssiDbm: { avg: null, min: null, max: null },
          },
        ],
      }),
    )

    render(<THHomePage device={makeDevice()} />)

    await waitFor(() => expect(screen.getByText('21.2°C')).toBeInTheDocument())
    expect(screen.getAllByTestId('line-chart')).toHaveLength(2)
    expect(screen.getByText('2 points · approximately 600s per point')).toBeInTheDocument()

    expect(lineCalls).toHaveLength(2)
    const [tempOptions, humidityOptions] = lineCalls.map((c) => c.options)

    const tempLabelFn = tempOptions.plugins?.tooltip?.callbacks?.label as (ctx: {
      parsed: { y: number | null }
    }) => string
    expect(tempLabelFn({ parsed: { y: 21.456 } })).toBe('Temperature: 21.5°C')
    expect(tempLabelFn({ parsed: { y: null } })).toBe('Temperature: —')

    const humidityLabelFn = humidityOptions.plugins?.tooltip?.callbacks?.label as (ctx: {
      parsed: { y: number | null }
    }) => string
    expect(humidityLabelFn({ parsed: { y: 44.4 } })).toBe('Humidity: 44.4%')

    const yTicksCallback = tempOptions.scales?.y?.ticks?.callback as (value: number) => string
    expect(yTicksCallback(21.46)).toBe('21.5')
  })

  it('shows "No measurements for this period." when analytics has no data points', async () => {
    vi.mocked(useMeasurements).mockReturnValue({ measurement: null, loading: true, error: null })
    vi.mocked(getDeviceAnalytics).mockResolvedValue(makeAnalytics({ data: [] }))

    render(<THHomePage device={makeDevice()} />)

    await waitFor(() =>
      expect(screen.getByText('No measurements for this period.')).toBeInTheDocument(),
    )
  })

  it('shows an error message when analytics fails to load (Error instance)', async () => {
    vi.mocked(useMeasurements).mockReturnValue({ measurement: null, loading: true, error: null })
    vi.mocked(getDeviceAnalytics).mockRejectedValue(new Error('analytics down'))

    render(<THHomePage device={makeDevice()} />)

    await waitFor(() => expect(screen.getByText('analytics down')).toBeInTheDocument())
  })

  it('shows a generic error message for non-Error rejections', async () => {
    vi.mocked(useMeasurements).mockReturnValue({ measurement: null, loading: true, error: null })
    vi.mocked(getDeviceAnalytics).mockRejectedValue('nope')

    render(<THHomePage device={makeDevice()} />)

    await waitFor(() => expect(screen.getByText('Failed to load analytics')).toBeInTheDocument())
  })

  it('re-fetches analytics with the newly selected range', async () => {
    vi.mocked(useMeasurements).mockReturnValue({ measurement: null, loading: true, error: null })
    vi.mocked(getDeviceAnalytics).mockResolvedValue(makeAnalytics())

    render(<THHomePage device={makeDevice({ uid: 'dev-9' })} />)

    await waitFor(() => expect(getDeviceAnalytics).toHaveBeenCalledWith('dev-9', '24h'))

    await userEvent.click(screen.getByRole('button', { name: '7d' }))

    await waitFor(() => expect(getDeviceAnalytics).toHaveBeenCalledWith('dev-9', '7d'))
  })

  it('ignores a stale analytics response that resolves after the device uid changes', async () => {
    vi.mocked(useMeasurements).mockReturnValue({ measurement: null, loading: true, error: null })

    let resolveFirst!: (value: AnalyticsResponse) => void
    const firstPromise = new Promise<AnalyticsResponse>((resolve) => {
      resolveFirst = resolve
    })
    vi.mocked(getDeviceAnalytics)
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce(makeAnalytics({ returnedPoints: 7 }))

    const { rerender } = render(<THHomePage device={makeDevice({ uid: 'dev-1' })} />)

    rerender(<THHomePage device={makeDevice({ uid: 'dev-2' })} />)

    await waitFor(() =>
      expect(screen.getByText('7 points · approximately 300s per point')).toBeInTheDocument(),
    )

    resolveFirst(makeAnalytics({ returnedPoints: 999 }))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(
      screen.getByText('7 points · approximately 300s per point'),
    ).toBeInTheDocument()
  })

  it('ignores a stale analytics rejection that resolves after the device uid changes', async () => {
    vi.mocked(useMeasurements).mockReturnValue({ measurement: null, loading: true, error: null })

    let rejectFirst!: (reason: unknown) => void
    const firstPromise = new Promise<AnalyticsResponse>((_resolve, reject) => {
      rejectFirst = reject
    })
    vi.mocked(getDeviceAnalytics)
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce(makeAnalytics({ returnedPoints: 7 }))

    const { rerender } = render(<THHomePage device={makeDevice({ uid: 'dev-1' })} />)

    rerender(<THHomePage device={makeDevice({ uid: 'dev-2' })} />)

    await waitFor(() =>
      expect(screen.getByText('7 points · approximately 300s per point')).toBeInTheDocument(),
    )

    rejectFirst(new Error('stale failure'))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(screen.queryByText('stale failure')).not.toBeInTheDocument()
    expect(
      screen.getByText('7 points · approximately 300s per point'),
    ).toBeInTheDocument()
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/hooks/usePowerState', () => ({
  usePowerState: vi.fn(),
}))
vi.mock('@/shared/api/power', () => ({
  getPowerHistory: vi.fn(),
}))
vi.mock('@/features/Devices/SmartPlug/PowerChart', () => ({
  PowerChart: ({ mode }: { mode?: string }) => (
    <div data-testid={`power-chart-${mode ?? 'timeline'}`} />
  ),
}))

import { getPowerHistory } from '@/shared/api/power'
import { usePowerState } from '@/shared/hooks/usePowerState'
import { makeDevice, makePowerHistory, makePowerState } from '@tests/factories'
import { SmartPlugPage } from '@/features/Devices/SmartPlug/Page'

function setPowerState(overrides: Partial<ReturnType<typeof makePowerState>> = {}, error: string | null = null) {
  vi.mocked(usePowerState).mockReturnValue({
    state: makePowerState(overrides),
    loading: false,
    error,
  })
}

describe('SmartPlugPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('shows a loading message before history resolves', () => {
    setPowerState()
    vi.mocked(getPowerHistory).mockReturnValue(new Promise(() => {}))

    render(<SmartPlugPage device={makeDevice({ uid: 'plug-1' })} />)

    expect(screen.getByText('Loading analytics...')).toBeInTheDocument()
  })

  it('renders the online badge and current-state copy', async () => {
    setPowerState({ status: 'online' })
    vi.mocked(getPowerHistory).mockResolvedValue(makePowerHistory())

    render(<SmartPlugPage device={makeDevice({ name: 'Plug', description: 'desc' })} />)

    expect(screen.getAllByText('Online').length).toBeGreaterThan(0)
    expect(screen.getByText('Smart plug is reachable.')).toBeInTheDocument()
    expect(screen.getByText('desc')).toBeInTheDocument()
    await waitFor(() => expect(getPowerHistory).toHaveBeenCalled())
  })

  it('renders the offline badge and copy', () => {
    setPowerState({ status: 'offline' })
    vi.mocked(getPowerHistory).mockReturnValue(new Promise(() => {}))

    render(<SmartPlugPage device={makeDevice()} />)

    expect(screen.getAllByText('Offline').length).toBeGreaterThan(0)
    expect(screen.getByText('Smart plug is not reachable.')).toBeInTheDocument()
  })

  it('falls back to unknown when power state has not loaded and reported no error', () => {
    vi.mocked(usePowerState).mockReturnValue({ state: null, loading: true, error: null })
    vi.mocked(getPowerHistory).mockReturnValue(new Promise(() => {}))

    render(<SmartPlugPage device={makeDevice()} />)

    expect(screen.getByText('Power supply status cannot be confirmed.')).toBeInTheDocument()
  })

  it('falls back to unknown status copy and shows the power-state error', () => {
    setPowerState({}, 'power state failed')
    vi.mocked(getPowerHistory).mockReturnValue(new Promise(() => {}))

    render(<SmartPlugPage device={makeDevice()} />)

    expect(screen.getByText('Power supply status cannot be confirmed.')).toBeInTheDocument()
    expect(screen.getByText('power state failed')).toBeInTheDocument()
  })

  it('renders statistics, both chart modes, and the timeline dates once history loads', async () => {
    setPowerState()
    const history = makePowerHistory({
      periods: [
        { id: 1, status: 'online', startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-01T18:00:00Z' },
        { id: 2, status: 'offline', startedAt: '2026-01-01T18:00:00Z', endedAt: '2026-01-02T00:00:00Z' },
      ],
    })
    vi.mocked(getPowerHistory).mockResolvedValue(history)

    render(<SmartPlugPage device={makeDevice()} />)

    await waitFor(() => expect(screen.getByText('75.0%')).toBeInTheDocument())
    expect(screen.getByTestId('power-chart-timeline')).toBeInTheDocument()
    expect(screen.getByTestId('power-chart-distribution')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // outages count
  })

  it('shows the no-outages message when there are no offline periods', async () => {
    setPowerState()
    vi.mocked(getPowerHistory).mockResolvedValue(
      makePowerHistory({
        periods: [
          { id: 1, status: 'online', startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-02T00:00:00Z' },
        ],
      }),
    )

    render(<SmartPlugPage device={makeDevice()} />)

    await waitFor(() =>
      expect(screen.getByText('No recorded outages in this period.')).toBeInTheDocument(),
    )
  })

  it('lists recent outages in reverse chronological order with clipped durations', async () => {
    setPowerState()
    vi.mocked(getPowerHistory).mockResolvedValue(
      makePowerHistory({
        periods: [
          { id: 1, status: 'offline', startedAt: '2026-01-01T01:00:00Z', endedAt: '2026-01-01T02:00:00Z' },
          { id: 2, status: 'offline', startedAt: '2026-01-01T10:00:00Z', endedAt: '2026-01-01T11:30:00Z' },
        ],
      }),
    )

    const { container } = render(<SmartPlugPage device={makeDevice()} />)

    await waitFor(() => expect(screen.getByText('Recent outages')).toBeInTheDocument())

    const eventList = container.querySelector('[class*="eventList"]') as HTMLElement
    const durations = Array.from(eventList.querySelectorAll('strong')).map(
      (el) => el.textContent,
    )
    // most recent outage (10:00-11:30, 90m) listed before the earlier one (01:00-02:00, 60m)
    expect(durations).toEqual(['1h 30m', '1h 0m'])
  })

  it('shows an error message when history fails to load (Error instance)', async () => {
    setPowerState()
    vi.mocked(getPowerHistory).mockRejectedValue(new Error('history unavailable'))

    render(<SmartPlugPage device={makeDevice()} />)

    await waitFor(() => expect(screen.getByText('history unavailable')).toBeInTheDocument())
  })

  it('shows a generic error message for non-Error rejections', async () => {
    setPowerState()
    vi.mocked(getPowerHistory).mockRejectedValue('nope')

    render(<SmartPlugPage device={makeDevice()} />)

    await waitFor(() =>
      expect(screen.getByText('Failed to load power history')).toBeInTheDocument(),
    )
  })

  it('ignores a successful history response that resolves after unmount', async () => {
    setPowerState()
    let resolveLoad!: (value: ReturnType<typeof makePowerHistory>) => void
    vi.mocked(getPowerHistory).mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve
      }),
    )

    const { unmount } = render(<SmartPlugPage device={makeDevice()} />)
    unmount()

    resolveLoad(makePowerHistory())
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  it('ignores a rejected history response that resolves after unmount', async () => {
    setPowerState()
    let rejectLoad!: (reason: unknown) => void
    vi.mocked(getPowerHistory).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectLoad = reject
      }),
    )

    const { unmount } = render(<SmartPlugPage device={makeDevice()} />)
    unmount()

    rejectLoad(new Error('too late'))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

  it('treats an ongoing outage (no endedAt) as running until "to" when computing its duration', async () => {
    setPowerState()
    vi.mocked(getPowerHistory).mockResolvedValue(
      makePowerHistory({
        to: '2026-01-01T06:00:00Z',
        periods: [
          { id: 1, status: 'offline', startedAt: '2026-01-01T04:00:00Z', endedAt: null },
        ],
      }),
    )

    const { container } = render(<SmartPlugPage device={makeDevice()} />)

    await waitFor(() => expect(screen.getByText('Recent outages')).toBeInTheDocument())

    const eventList = container.querySelector('[class*="eventList"]') as HTMLElement
    expect(eventList.querySelector('strong')).toHaveTextContent('2h 0m')
  })

  it('switches range and re-fetches history with the selected range', async () => {
    setPowerState()
    vi.mocked(getPowerHistory).mockResolvedValue(makePowerHistory())

    render(<SmartPlugPage device={makeDevice({ uid: 'plug-7' })} />)

    await waitFor(() => expect(getPowerHistory).toHaveBeenCalledTimes(1))
    expect(getPowerHistory).toHaveBeenCalledWith('plug-7', '24h', expect.anything())

    const sevenDayButton = screen.getByRole('button', { name: '7d' })
    expect(sevenDayButton).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(sevenDayButton)

    await waitFor(() => expect(getPowerHistory).toHaveBeenCalledTimes(2))
    expect(getPowerHistory).toHaveBeenCalledWith('plug-7', '7d', expect.anything())
    expect(sevenDayButton).toHaveAttribute('aria-pressed', 'true')
  })

  describe('polling', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('refreshes history every 60 seconds', async () => {
      setPowerState()
      vi.mocked(getPowerHistory).mockResolvedValue(makePowerHistory())

      render(<SmartPlugPage device={makeDevice()} />)

      await vi.waitFor(() => expect(getPowerHistory).toHaveBeenCalledTimes(1))

      await vi.advanceTimersByTimeAsync(60_000)
      expect(getPowerHistory).toHaveBeenCalledTimes(2)
    })

    it('stops polling and aborts the in-flight request on unmount', async () => {
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort')
      setPowerState()
      vi.mocked(getPowerHistory).mockResolvedValue(makePowerHistory())

      const { unmount } = render(<SmartPlugPage device={makeDevice()} />)
      await vi.waitFor(() => expect(getPowerHistory).toHaveBeenCalledTimes(1))

      unmount()
      expect(abortSpy).toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(120_000)
      expect(getPowerHistory).toHaveBeenCalledTimes(1)
    })
  })
})

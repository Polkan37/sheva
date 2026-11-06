import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Tooltip } from 'chart.js'

// Loosely typed on purpose: this file only inspects the shape of props chart.js
// receives, so fighting chart.js's strict per-scale-type unions adds no value.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CapturedProps = { data: any; options: any }

const barCalls: CapturedProps[] = []

vi.mock('react-chartjs-2', () => ({
  Bar: (props: CapturedProps) => {
    barCalls.push(props)
    return <div data-testid="bar-chart" />
  },
}))

import { makePowerHistory } from '@tests/factories'
import { PowerChart } from '@/features/Devices/SmartPlug/PowerChart'

function lastCall() {
  return barCalls[barCalls.length - 1]
}

describe('PowerChart', () => {
  it('registers a cursor tooltip positioner that follows the event location', () => {
    const cursor = Tooltip.positioners.cursor as unknown as (
      elements: unknown[],
      eventPosition: { x: number; y: number },
    ) => { x: number; y: number; xAlign: string; yAlign: string }

    const position = cursor([], { x: 12, y: 34 })
    expect(position).toEqual({ x: 12, y: 34, xAlign: 'center', yAlign: 'bottom' })
  })

  it('builds one dataset per timeline period in timeline mode', () => {
    barCalls.length = 0
    const history = makePowerHistory({
      periods: [
        { id: 1, status: 'online', startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-01T12:00:00Z' },
        { id: 2, status: 'offline', startedAt: '2026-01-01T12:00:00Z', endedAt: '2026-01-02T00:00:00Z' },
      ],
    })

    render(<PowerChart history={history} />)

    const { data } = lastCall() as { data: { datasets: Array<{ label: string }> } }
    expect(data.datasets).toHaveLength(2)
    expect(data.datasets[0].label).toBe('Power available')
    expect(data.datasets[1].label).toBe('Power unavailable')
  })

  it('uses hourly ticks for a range of a day or less', () => {
    barCalls.length = 0
    const history = makePowerHistory({
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-01T12:00:00Z',
    })

    render(<PowerChart history={history} />)

    const { options } = lastCall()
    expect(options.scales?.x?.time?.unit).toBe('hour')
    expect(options.scales?.x?.ticks?.maxTicksLimit).toBe(13)
  })

  it('uses daily ticks for a range longer than a day', () => {
    barCalls.length = 0
    const history = makePowerHistory({
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-08T00:00:00Z',
    })

    render(<PowerChart history={history} />)

    const { options } = lastCall()
    expect(options.scales?.x?.time?.unit).toBe('day')
    expect(options.scales?.x?.ticks?.maxTicksLimit).toBe(10)
  })

  it('formats the tooltip label with status, times and duration', () => {
    barCalls.length = 0
    const history = makePowerHistory({
      periods: [
        { id: 1, status: 'online', startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-01T06:00:00Z' },
      ],
    })

    render(<PowerChart history={history} />)

    const { options } = lastCall()
    const labelFn = options.plugins?.tooltip?.callbacks?.label as (ctx: {
      datasetIndex: number
    }) => string[]

    expect(options.plugins?.tooltip?.callbacks?.title?.({} as never)).toBe('')
    const lines = labelFn({ datasetIndex: 0 })
    expect(lines[0]).toBe('Power available')
    expect(lines[3]).toBe('6h 0m')
  })

  it('returns an empty label when the dataset index is out of range', () => {
    barCalls.length = 0
    render(<PowerChart history={makePowerHistory()} />)

    const { options } = lastCall()
    const labelFn = options.plugins?.tooltip?.callbacks?.label as (ctx: {
      datasetIndex: number
    }) => string
    expect(labelFn({ datasetIndex: 99 })).toBe('')
  })

  it('renders a stacked distribution chart with one dataset per status', () => {
    barCalls.length = 0
    const history = makePowerHistory({
      periods: [
        { id: 1, status: 'online', startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-02T00:00:00Z' },
      ],
    })

    render(<PowerChart history={history} mode="distribution" />)

    const { data, options } = lastCall() as {
      data: { datasets: Array<{ label: string; data: number[] }> }
      options: { scales?: { x?: { max?: number } } }
    }
    expect(data.datasets.map((d) => d.label)).toEqual([
      'Power available',
      'Power unavailable',
      'Unknown',
    ])
    expect(data.datasets[0].data[0]).toBeCloseTo(100, 5)
    expect(options.scales?.x?.max).toBe(100)
  })

  it('formats the distribution tooltip with percentage and duration', () => {
    barCalls.length = 0
    const history = makePowerHistory({
      periods: [
        { id: 1, status: 'online', startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-02T00:00:00Z' },
      ],
    })

    render(<PowerChart history={history} mode="distribution" />)

    const { options } = lastCall()
    const labelFn = options.plugins?.tooltip?.callbacks?.label as (ctx: {
      datasetIndex: number
      parsed: { x: number }
    }) => string

    expect(options.plugins?.tooltip?.callbacks?.title?.({} as never)).toBe('')
    expect(labelFn({ datasetIndex: 0, parsed: { x: 100 } })).toBe('Power available: 1d 0h (100.0%)')
  })

  it('returns an empty distribution label for an out-of-range status index', () => {
    barCalls.length = 0
    render(<PowerChart history={makePowerHistory()} mode="distribution" />)

    const { options } = lastCall()
    const labelFn = options.plugins?.tooltip?.callbacks?.label as (ctx: {
      datasetIndex: number
      parsed: { x: number }
    }) => string
    expect(labelFn({ datasetIndex: 99, parsed: { x: 0 } })).toBe('')
  })

  it('handles a zero-duration range without dividing by zero', () => {
    barCalls.length = 0
    const history = makePowerHistory({ from: '2026-01-01T00:00:00Z', to: '2026-01-01T00:00:00Z' })

    render(<PowerChart history={history} mode="distribution" />)

    const { data } = lastCall() as { data: { datasets: Array<{ data: number[] }> } }
    expect(data.datasets.every((d) => d.data[0] === 0)).toBe(true)
  })

  it('positions the cursor tooltip at the event location', () => {
    barCalls.length = 0
    render(<PowerChart history={makePowerHistory()} mode="distribution" />)

    const { options } = lastCall()
    expect(options.plugins?.tooltip?.position).toBe('cursor')
  })
})

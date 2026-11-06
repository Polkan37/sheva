import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { makeYasnoIntegration } from '@tests/factories'
import YasnoPage from '@/features/Integrations/Yasno/Page'

describe('YasnoPage', () => {
  it('renders provider, group and the formatted address', () => {
    render(
      <YasnoPage
        integration={makeYasnoIntegration({
          provider: 'Yasno',
          group: '3.1',
          address: { street: 'Khreshchatyk', house: '1' },
        })}
      />,
    )

    expect(screen.getByText('Yasno', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Khreshchatyk, 1')).toBeInTheDocument()
  })

  it('omits the address paragraph when there is no address', () => {
    const { container } = render(<YasnoPage integration={makeYasnoIntegration({ address: null })} />)
    expect(container.querySelector('[class*="address"]')).not.toBeInTheDocument()
  })

  it('shows "Відключень немає" for NoOutages status', () => {
    render(<YasnoPage integration={makeYasnoIntegration({ status: 'NoOutages' })} />)
    expect(screen.getByText('Відключень немає')).toBeInTheDocument()
  })

  it('shows "Можливі відключення" for any other status', () => {
    render(<YasnoPage integration={makeYasnoIntegration({ status: 'ScheduleApplies' })} />)
    expect(screen.getByText('Можливі відключення')).toBeInTheDocument()
  })

  it('shows the lastError banner when present', () => {
    render(<YasnoPage integration={makeYasnoIntegration({ lastError: 'sync failed' })} />)
    expect(screen.getByText(/sync failed/)).toBeInTheDocument()
  })

  it('omits the error banner when there is no error', () => {
    render(<YasnoPage integration={makeYasnoIntegration({ lastError: null })} />)
    expect(screen.queryByText(/Не вдалося оновити графік/)).not.toBeInTheDocument()
  })

  it("renders today's schedule by default and highlights slots within an hour", () => {
    const { container } = render(
      <YasnoPage
        integration={makeYasnoIntegration({
          schedule: {
            today: {
              slots: [{ start: 30, end: 90, type: 'Definite' }],
              date: '2026-01-15',
              status: 'ScheduleApplies',
            },
            tomorrow: { slots: [], date: '2026-01-16', status: 'ScheduleApplies' },
            updatedOn: '2026-01-15T00:00:00Z',
          },
        })}
      />,
    )

    // hour divs use the exact "_hour_<hash>" class; "_hours_" (container) and
    // "_hourLabel_"/"_hourFill_" (children) all contain "hour" too, so match the prefix precisely
    const hours = container.querySelectorAll('[class^="_hour_"]')
    expect(hours).toHaveLength(24)

    // hour 0 (0-60) gets the second half of the slot: left 50%, width 50%
    const hour0Fill = hours[0].querySelector('[class*="hourFill"]') as HTMLElement
    expect(hour0Fill.style.left).toBe('50%')
    expect(hour0Fill.style.width).toBe('50%')

    // hour 1 (60-120) gets the first half: left 0%, width 50%
    const hour1Fill = hours[1].querySelector('[class*="hourFill"]') as HTMLElement
    expect(hour1Fill.style.left).toBe('0%')
    expect(hour1Fill.style.width).toBe('50%')
  })

  it('switches to tomorrow\'s schedule when the tab is clicked', async () => {
    render(
      <YasnoPage
        integration={makeYasnoIntegration({
          schedule: {
            today: { slots: [], date: '2026-01-15', status: 'ScheduleApplies' },
            tomorrow: {
              slots: [{ start: 0, end: 1440, type: 'Definite' }],
              date: '2026-01-20',
              status: 'ScheduleApplies',
            },
            updatedOn: '2026-01-15T00:00:00Z',
          },
        })}
      />,
    )

    const tomorrowButton = screen.getByRole('button', { name: 'Завтра' })
    await userEvent.click(tomorrowButton)

    expect(tomorrowButton.className).toContain('activeDay')
    const fills = document.querySelectorAll('[class*="hourFill"]')
    expect(fills.length).toBe(24)

    const todayButton = screen.getByRole('button', { name: 'Сьогодні' })
    await userEvent.click(todayButton)

    expect(todayButton.className).toContain('activeDay')
    expect(tomorrowButton.className).not.toContain('activeDay')
  })

  it('falls back to an empty class for an unrecognized slot type', () => {
    const { container } = render(
      <YasnoPage
        integration={makeYasnoIntegration({
          schedule: {
            today: {
              slots: [{ start: 0, end: 60, type: 'SomeUnknownType' }],
              date: '2026-01-15',
              status: 'ScheduleApplies',
            },
            tomorrow: { slots: [], date: '2026-01-16', status: 'ScheduleApplies' },
            updatedOn: '2026-01-15T00:00:00Z',
          },
        })}
      />,
    )

    const fill = container.querySelector('[class*="hourFill"]') as HTMLElement
    // no status class token is appended since the slot type has no matching style
    expect(fill.className.trim().split(/\s+/)).toHaveLength(1)
  })

  it('renders 24 hour blocks with zero-padded labels', () => {
    render(<YasnoPage integration={makeYasnoIntegration()} />)

    expect(screen.getByText('00:00')).toBeInTheDocument()
    expect(screen.getByText('23:00')).toBeInTheDocument()
  })
})

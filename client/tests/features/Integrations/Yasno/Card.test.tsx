import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { makeYasnoIntegration } from '@tests/factories'
import YasnoCard from '@/features/Integrations/Yasno/Card'

describe('YasnoCard', () => {
  it('shows the no-outages message and omits the schedule grid', () => {
    render(<YasnoCard integration={makeYasnoIntegration({ status: 'NoOutages' })} />)

    expect(screen.getByText('Без відключень')).toBeInTheDocument()
    expect(screen.getByText('весь день, цілий день, світло є')).toBeInTheDocument()
    expect(screen.queryByText(/Сьогодні,/)).not.toBeInTheDocument()
  })

  it('shows the active-schedule message with a computed description and renders slots', () => {
    const shutdown = new Date('2026-01-15T10:00:00Z').getTime()
    const restore = new Date('2026-01-15T14:00:00Z').getTime()

    render(
      <YasnoCard
        integration={makeYasnoIntegration({
          status: 'ScheduleApplies',
          nextShutdownTime: shutdown,
          nextRestoreTime: restore,
          schedule: {
            today: {
              slots: [{ start: 0, end: 60, type: 'Definite' }],
              date: '2026-01-15',
              status: 'ScheduleApplies',
            },
            tomorrow: { slots: [], date: '2026-01-16', status: 'ScheduleApplies' },
            updatedOn: '2026-01-15T00:00:00Z',
          },
        })}
      />,
    )

    expect(screen.getByText('Діють графіки відключень')).toBeInTheDocument()
    expect(screen.getByText(/Наступне:/)).toBeInTheDocument()
    expect(screen.getByText('Немає світла')).toBeInTheDocument()
  })

  it('shows the possible-shutdowns message and renders the schedule grid', () => {
    render(
      <YasnoCard
        integration={makeYasnoIntegration({
          status: 'PossibleShutdowns',
          schedule: {
            today: {
              slots: [{ start: 0, end: 60, type: 'NotPlanned' }],
              date: '2026-01-15',
              status: 'PossibleShutdowns',
            },
            tomorrow: { slots: [], date: '2026-01-16', status: 'PossibleShutdowns' },
            updatedOn: '2026-01-15T00:00:00Z',
          },
        })}
      />,
    )

    expect(screen.getByText('Можливі відключення')).toBeInTheDocument()
    expect(screen.getByText('Світло є')).toBeInTheDocument()
  })

  it('shows the emergency-shutdowns message and omits the schedule grid', () => {
    render(<YasnoCard integration={makeYasnoIntegration({ status: 'EmergencyShutdowns' })} />)

    expect(screen.getByText('Екстренні відключення')).toBeInTheDocument()
    expect(screen.getByText('Графіки наразі не діють')).toBeInTheDocument()
    expect(screen.queryByText(/Сьогодні,/)).not.toBeInTheDocument()
  })

  it('renders nothing from ScheduleCardInfo for an unrecognized status, but still shows the grid', () => {
    render(
      <YasnoCard
        integration={makeYasnoIntegration({
          status: 'SomeFutureStatus',
          schedule: {
            today: {
              slots: [{ start: 0, end: 60, type: 'Maybe' }],
              date: '2026-01-15',
              status: 'SomeFutureStatus',
            },
            tomorrow: { slots: [], date: '2026-01-16', status: 'SomeFutureStatus' },
            updatedOn: '2026-01-15T00:00:00Z',
          },
        })}
      />,
    )

    expect(screen.getByText('Можливе відключення')).toBeInTheDocument()
  })

  it('renders the last sync time and group', () => {
    render(
      <YasnoCard
        integration={makeYasnoIntegration({
          group: '4.2',
          lastSyncAt: '2026-01-15T10:00:00Z',
          status: 'NoOutages',
        })}
      />,
    )

    expect(screen.getByText('Черга 4.2')).toBeInTheDocument()
    expect(screen.getByText(/Оновлено:/)).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ScheduleCardInfo from '@/features/Integrations/Yasno/ScheduleCardInfo'

describe('ScheduleCardInfo', () => {
  it('renders nothing when status is undefined', () => {
    const { container } = render(<ScheduleCardInfo status={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the message and description when status is provided', () => {
    render(
      <ScheduleCardInfo
        status={{
          key: 'ScheduleApplies',
          message: 'Діють графіки відключень',
          description: 'До 18:00 немає світла',
          styleClass: 'disabled',
        }}
      />,
    )

    expect(screen.getByText('Діють графіки відключень')).toBeInTheDocument()
    expect(screen.getByText('До 18:00 немає світла')).toBeInTheDocument()
  })

  it('renders an empty description when description is null', () => {
    const { container } = render(
      <ScheduleCardInfo
        status={{ key: 'NoOutages', message: 'Без відключень', description: null, styleClass: null }}
      />,
    )

    expect(screen.getByText('Без відключень')).toBeInTheDocument()
    expect(container.querySelector('[class*="description"]')).toBeEmptyDOMElement()
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { Room } from '@/shared/api/rooms'
import { Card } from '@/features/Card/Card'

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: '1',
    name: 'Kitchen',
    slug: 'kitchen',
    displayOrder: 0,
    temperature: 21.4,
    humidity: 45,
    ...overrides,
  }
}

describe('Card', () => {
  it('renders children when no room is provided', () => {
    render(
      <Card>
        <span>child content</span>
      </Card>,
    )

    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('renders room name, temperature and humidity when a room is provided', () => {
    render(<Card room={makeRoom()} />)

    expect(screen.getByText('Kitchen')).toBeInTheDocument()
    expect(screen.getByTitle('temperature')).toHaveTextContent('21.4°C')
    expect(screen.getByTitle('humidity')).toHaveTextContent('45%')
  })

  it('renders room content instead of children when both are given', () => {
    render(
      <Card room={makeRoom()}>
        <span>should not render</span>
      </Card>,
    )

    expect(screen.queryByText('should not render')).not.toBeInTheDocument()
    expect(screen.getByText('Kitchen')).toBeInTheDocument()
  })

  it('omits the temperature indicator when temperature is zero/falsy', () => {
    render(<Card room={makeRoom({ temperature: 0 })} />)

    expect(screen.queryByTitle('temperature')).not.toBeInTheDocument()
  })

  it('omits the temperature indicator when temperature is null', () => {
    render(<Card room={makeRoom({ temperature: null })} />)

    expect(screen.queryByTitle('temperature')).not.toBeInTheDocument()
  })

  it('omits the humidity indicator when humidity is zero/falsy', () => {
    render(<Card room={makeRoom({ humidity: 0 })} />)

    expect(screen.queryByTitle('humidity')).not.toBeInTheDocument()
  })

  it('omits the humidity indicator when humidity is null', () => {
    render(<Card room={makeRoom({ humidity: null })} />)

    expect(screen.queryByTitle('humidity')).not.toBeInTheDocument()
  })

  it('merges the base card class with a custom className regardless of active state', () => {
    const { container: inactive } = render(<Card className="custom-class">x</Card>)
    const { container: active } = render(<Card active className="custom-class">x</Card>)

    const inactiveClass = (inactive.firstChild as HTMLElement).className
    const activeClass = (active.firstChild as HTMLElement).className

    expect(inactiveClass).toContain('custom-class')
    expect(activeClass).toContain('custom-class')
    expect(inactiveClass.split(' ').filter(Boolean).length).toBeGreaterThan(0)
  })

  it('forwards arbitrary DOM props such as event handlers', async () => {
    let entered = false
    render(
      <Card onPointerEnter={() => (entered = true)}>
        <span>x</span>
      </Card>,
    )

    await userEvent.hover(screen.getByText('x').parentElement as HTMLElement)
    expect(entered).toBe(true)
  })
})

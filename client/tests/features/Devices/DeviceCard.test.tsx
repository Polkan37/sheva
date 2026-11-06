import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { makeDevice } from '@tests/factories'
import { DeviceCard } from '@/features/Devices/DeviceCard'

describe('DeviceCard', () => {
  it('renders the device name', () => {
    render(<DeviceCard device={makeDevice({ name: 'Bedroom sensor' })} />)
    expect(screen.getByText('Bedroom sensor')).toBeInTheDocument()
  })

  it('renders the description when present', () => {
    render(<DeviceCard device={makeDevice({ description: 'Top shelf' })} />)
    expect(screen.getByText('Top shelf')).toBeInTheDocument()
  })

  it('omits the description element when there is none', () => {
    const { container } = render(<DeviceCard device={makeDevice({ description: null })} />)
    expect(container.querySelector('span')).not.toBeInTheDocument()
  })
})

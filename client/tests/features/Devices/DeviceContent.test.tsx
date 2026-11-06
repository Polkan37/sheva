import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { makeDevice } from '@tests/factories'
import { DeviceContent } from '@/features/Devices/DeviceContent'

describe('DeviceContent', () => {
  it('renders the device name, description and room name', () => {
    render(
      <DeviceContent
        device={makeDevice({
          name: 'Hallway plug',
          description: 'Controls the hallway light',
          room: { id: '1', name: 'Hallway' },
        })}
      />,
    )

    expect(screen.getByText('Hallway plug')).toBeInTheDocument()
    expect(screen.getByText('Controls the hallway light')).toBeInTheDocument()
    expect(screen.getByText('Room: Hallway')).toBeInTheDocument()
  })

  it('falls back to "Unknown" when the device has no room', () => {
    render(<DeviceContent device={makeDevice({ room: null })} />)
    expect(screen.getByText('Room: Unknown')).toBeInTheDocument()
  })
})

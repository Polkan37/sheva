import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/Devices/THHome/Page', () => ({ THHomePage: () => <div>THHome Page</div> }))
vi.mock('@/features/Devices/SmartPlug/Page', () => ({ SmartPlugPage: () => <div>SmartPlug Page</div> }))

import { makeDevice } from '@tests/factories'
import { DevicePageList } from '@/features/Devices/DevicePageList'

describe('DevicePageList', () => {
  it('renders THHomePage for environment sensors', () => {
    render(<DevicePageList device={makeDevice({ type: 'environment_sensor' })} />)
    expect(screen.getByText('THHome Page')).toBeInTheDocument()
  })

  it('renders SmartPlugPage for smart plugs', () => {
    render(<DevicePageList device={makeDevice({ type: 'smart_plug' })} />)
    expect(screen.getByText('SmartPlug Page')).toBeInTheDocument()
  })

  it('renders the default DeviceContent for unrecognized types', () => {
    render(<DevicePageList device={makeDevice({ type: 'other', name: 'Other device' })} />)
    expect(screen.getByText('Other device')).toBeInTheDocument()
  })
})

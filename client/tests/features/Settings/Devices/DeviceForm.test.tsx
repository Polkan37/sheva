import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { makeDevice, makeRoom } from '@tests/factories'
import { DeviceForm } from '@/features/Settings/Devices/DeviceForm'

describe('DeviceForm', () => {
  it('shows "Add device" with blank defaults when there is no device', () => {
    render(
      <DeviceForm device={null} rooms={[]} isSaving={false} error={null} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getByText('Add device')).toBeInTheDocument()
    expect(screen.getByLabelText('Sample interval (seconds)')).toHaveValue(60)
  })

  it('shows "Edit device" and pre-fills fields from the device', () => {
    render(
      <DeviceForm
        device={makeDevice({
          name: 'Plug',
          uid: 'plug-1',
          type: 'smart_plug',
          room: { id: 'r1', name: 'Kitchen' },
        })}
        rooms={[makeRoom({ id: 'r1', name: 'Kitchen' })]}
        isSaving={false}
        error={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Edit device')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Plug')
    expect(screen.getByLabelText('Room')).toHaveValue('r1')
  })

  it('lists rooms as select options plus a "No room" fallback', () => {
    render(
      <DeviceForm
        device={null}
        rooms={[makeRoom({ id: 'r1', name: 'Kitchen' }), makeRoom({ id: 'r2', name: 'Hall' })]}
        isSaving={false}
        error={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('option', { name: 'No room' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Kitchen' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Hall' })).toBeInTheDocument()
  })

  it('trims text fields, nulls out blanks, and submits a numeric sample interval', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <DeviceForm device={null} rooms={[]} isSaving={false} error={null} onSave={onSave} onClose={vi.fn()} />,
    )

    await userEvent.type(screen.getByLabelText('Name'), '  Sensor  ')
    await userEvent.type(screen.getByLabelText('UID'), '  sensor-1  ')
    await userEvent.type(screen.getByLabelText('Type'), '  environment_sensor  ')
    await userEvent.type(screen.getByLabelText('Description'), '   ')
    await userEvent.type(screen.getByLabelText('Firmware version'), '   ')
    await userEvent.type(screen.getByLabelText('MAC address'), '   ')
    await userEvent.type(screen.getByLabelText('device IP'), '   ')

    await userEvent.click(screen.getByRole('button', { name: 'Save device' }))

    expect(onSave).toHaveBeenCalledWith({
      uid: 'sensor-1',
      name: 'Sensor',
      type: 'environment_sensor',
      description: null,
      macAddress: null,
      ipAddress: null,
      roomId: null,
      sampleIntervalSec: 60,
      firmwareVersion: null,
    })
  })

  it('submits the selected room id and trimmed optional fields when provided', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <DeviceForm
        device={null}
        rooms={[makeRoom({ id: 'r1', name: 'Kitchen' })]}
        isSaving={false}
        error={null}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )

    await userEvent.type(screen.getByLabelText('Name'), 'Plug')
    await userEvent.type(screen.getByLabelText('UID'), 'plug-1')
    await userEvent.type(screen.getByLabelText('Type'), 'smart_plug')
    await userEvent.selectOptions(screen.getByLabelText('Room'), 'r1')
    await userEvent.type(screen.getByLabelText('MAC address'), ' AA:BB:CC:DD:EE:FF ')
    await userEvent.type(screen.getByLabelText('device IP'), ' 192.168.1.5 ')

    const intervalInput = screen.getByLabelText('Sample interval (seconds)')
    await userEvent.clear(intervalInput)
    await userEvent.type(intervalInput, '45')

    await userEvent.click(screen.getByRole('button', { name: 'Save device' }))

    const payload = onSave.mock.calls[0][0]
    expect(payload.roomId).toBe('r1')
    expect(payload.macAddress).toBe('AA:BB:CC:DD:EE:FF')
    expect(payload.ipAddress).toBe('192.168.1.5')
    expect(payload.sampleIntervalSec).toBe(45)
  })

  it('nulls out optional fields when cleared back to empty after being filled', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <DeviceForm
        device={null}
        rooms={[makeRoom({ id: 'r1', name: 'Kitchen' })]}
        isSaving={false}
        error={null}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )

    await userEvent.type(screen.getByLabelText('Name'), 'Plug')
    await userEvent.type(screen.getByLabelText('UID'), 'plug-1')
    await userEvent.type(screen.getByLabelText('Type'), 'smart_plug')

    await userEvent.selectOptions(screen.getByLabelText('Room'), 'r1')
    await userEvent.selectOptions(screen.getByLabelText('Room'), '')

    await userEvent.type(screen.getByLabelText('Description'), 'temp')
    await userEvent.clear(screen.getByLabelText('Description'))

    await userEvent.type(screen.getByLabelText('Firmware version'), 'v1')
    await userEvent.clear(screen.getByLabelText('Firmware version'))

    await userEvent.type(screen.getByLabelText('MAC address'), 'AA')
    await userEvent.clear(screen.getByLabelText('MAC address'))

    await userEvent.type(screen.getByLabelText('device IP'), '1.2.3.4')
    await userEvent.clear(screen.getByLabelText('device IP'))

    await userEvent.click(screen.getByRole('button', { name: 'Save device' }))

    const payload = onSave.mock.calls[0][0]
    expect(payload.roomId).toBeNull()
    expect(payload.description).toBeNull()
    expect(payload.firmwareVersion).toBeNull()
    expect(payload.macAddress).toBeNull()
    expect(payload.ipAddress).toBeNull()
  })

  it('does not submit while isSaving is true', () => {
    const onSave = vi.fn()
    render(
      <DeviceForm device={null} rooms={[]} isSaving error={null} onSave={onSave} onClose={vi.fn()} />,
    )

    const form = screen.getByRole('button', { name: 'Saving...' }).closest('form') as HTMLFormElement
    fireEvent.submit(form)

    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    render(
      <DeviceForm device={null} rooms={[]} isSaving={false} error={null} onSave={vi.fn()} onClose={onClose} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders the error message when present', () => {
    render(
      <DeviceForm device={null} rooms={[]} isSaving={false} error="UID already exists" onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('UID already exists')
  })
})

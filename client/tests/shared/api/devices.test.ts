import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api/client', () => ({
  apiFetch: vi.fn(),
  apiRequest: vi.fn(),
}))

import { apiFetch, apiRequest } from '@/shared/api/client'
import { createDevice, deleteDevice, getDevices, updateDevice } from '@/shared/api/devices'

describe('devices api', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('getDevices fetches the devices endpoint with the given signal', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ devices: [] })
    const controller = new AbortController()

    await getDevices(controller.signal)

    expect(apiFetch).toHaveBeenCalledWith('/api/devices', controller.signal)
  })

  it('createDevice posts the device payload', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined)
    const input = {
      uid: 'dev-1',
      name: 'Sensor',
      description: null,
      type: 'environment_sensor',
      macAddress: null,
      ipAddress: null,
      roomId: null,
      sampleIntervalSec: 60,
      firmwareVersion: null,
    }

    await createDevice(input)

    expect(apiRequest).toHaveBeenCalledWith('/api/devices', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  })

  it('updateDevice patches the device by id with encoded URL', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined)

    await updateDevice('id with space', { name: 'New name' })

    expect(apiRequest).toHaveBeenCalledWith('/api/devices/id%20with%20space', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New name' }),
    })
  })

  it('deleteDevice issues a DELETE to the device endpoint', async () => {
    vi.mocked(apiRequest).mockResolvedValue(undefined)

    await deleteDevice('id-1')

    expect(apiRequest).toHaveBeenCalledWith('/api/devices/id-1', { method: 'DELETE' })
  })
})

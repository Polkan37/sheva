
import { apiFetch, apiRequest } from './client'

export type Device = {
  id: string
  uid: string
  name: string
  description: string | null
  type: string
  macAddress: string | null
  ipAddress: string | null

  room: {
    id: string
    name: string
  } | null

  sampleIntervalSec: number
  firmwareVersion: string | null
  lastSeenAt: string | null
  online: boolean
}

export type DeviceInput = {
  uid: string
  name: string
  description: string | null
  type: string
  macAddress: string | null
  ipAddress: string | null
  roomId: string | null
  sampleIntervalSec: number
  firmwareVersion: string | null
}

export type DevicesResponse = {
  devices: Device[]
}

export function getDevices(signal?: AbortSignal) {
  return apiFetch<DevicesResponse>('/api/devices', signal)
}

export function createDevice(data: DeviceInput) {
  return apiRequest<void>('/api/devices', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateDevice(
  id: string,
  data: Partial<DeviceInput>,
) {
  return apiRequest<void>(
    `/api/devices/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  )
}

export function deleteDevice(id: string) {
  return apiRequest<void>(
    `/api/devices/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}

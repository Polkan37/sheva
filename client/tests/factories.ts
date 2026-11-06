import type { Device } from '@/shared/api/devices'
import type { Room } from '@/shared/api/rooms'
import type { PowerHistory, PowerState } from '@/shared/api/power'
import type { Measurement } from '@/shared/api/measurements'
import type { IntegrationSettings } from '@/shared/api/integrations'
import type { WeatherIntegration, YasnoIntegration } from '@/entities/Integration/types'

export function makeDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: '1',
    uid: 'dev-1',
    name: 'Living room sensor',
    description: null,
    type: 'environment_sensor',
    macAddress: null,
    ipAddress: null,
    room: null,
    sampleIntervalSec: 60,
    firmwareVersion: null,
    lastSeenAt: null,
    online: true,
    ...overrides,
  }
}

export function makeRoom(overrides: Partial<Room> = {}): Room {
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

export function makeMeasurement(overrides: Partial<Measurement> = {}): Measurement {
  return {
    id: 1,
    sequence: 1,
    capturedAt: '2026-01-15T12:00:00Z',
    receivedAt: '2026-01-15T12:00:01Z',
    temperatureC: 21,
    humidityPct: 40,
    batteryVoltage: 3.1,
    batteryPct: 80,
    rssiDbm: -60,
    firmwareVersion: '1.0.0',
    ...overrides,
  }
}

export function makePowerState(overrides: Partial<PowerState> = {}): PowerState {
  return {
    deviceUid: 'plug-1',
    status: 'online',
    since: null,
    lastCheckedAt: null,
    ...overrides,
  }
}

export function makePowerHistory(overrides: Partial<PowerHistory> = {}): PowerHistory {
  return {
    deviceUid: 'plug-1',
    from: '2026-01-01T00:00:00Z',
    to: '2026-01-02T00:00:00Z',
    periods: [],
    ...overrides,
  }
}

export function makeIntegrationSettings(
  overrides: Partial<IntegrationSettings> = {},
): IntegrationSettings {
  return {
    id: '1',
    uid: 'yasno',
    name: 'Yasno',
    type: 'power_outages',
    description: null,
    enabled: true,
    status: 'ok',
    lastError: null,
    lastSyncAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function makeYasnoIntegration(
  overrides: Partial<YasnoIntegration> = {},
): YasnoIntegration {
  return {
    id: '1',
    uid: 'yasno',
    name: 'Yasno',
    description: null,
    type: 'power_outages',
    enabled: true,
    group: '3.1',
    provider: 'Yasno',
    status: 'ScheduleApplies',
    nextShutdownTime: null,
    nextRestoreTime: null,
    scheduleUpdatedAt: null,
    schedule: {
      today: { slots: [], date: '2026-01-15', status: 'ScheduleApplies' },
      tomorrow: { slots: [], date: '2026-01-16', status: 'ScheduleApplies' },
      updatedOn: '2026-01-15T00:00:00Z',
    },
    address: null,
    lastSyncAt: '2026-01-15T00:00:00Z',
    lastError: null,
    ...overrides,
  }
}

export function makeWeatherIntegration(
  overrides: Partial<WeatherIntegration> = {},
): WeatherIntegration {
  return {
    id: '2',
    uid: 'ukrhmc',
    name: 'UkrHMC',
    description: null,
    type: 'weather',
    enabled: true,
    city: 'Kyiv',
    current: {
      temperature: 5,
      condition: 'clear',
      conditionCode: 1,
      humidity: 60,
      pressure: 1013,
      precipitation: 0,
      windSpeed: 3,
      windDirection: 180,
      windCompass: 'S',
      dewPoint: 1,
      isNight: false,
    },
    forecast: [],
    updatedAt: '2026-01-15T00:00:00Z',
    lastSyncAt: '2026-01-15T00:00:00Z',
    lastError: null,
    ...overrides,
  }
}

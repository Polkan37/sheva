import { describe, expect, it } from 'vitest'
import {
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
} from 'lucide-react'
import { getBatteryIcon } from '@/features/Devices/THHome/BatteryIcon'

describe('getBatteryIcon', () => {
  it('returns the charging icon when isCharging is true, regardless of percent', () => {
    expect(getBatteryIcon(50, true)).toBe(BatteryCharging)
    expect(getBatteryIcon(null, true)).toBe(BatteryCharging)
  })

  it('returns the generic battery icon when percent is null', () => {
    expect(getBatteryIcon(null)).toBe(Battery)
  })

  it('returns the generic battery icon when percent is undefined', () => {
    expect(getBatteryIcon(undefined)).toBe(Battery)
  })

  it('returns the full icon at or above 80%', () => {
    expect(getBatteryIcon(80)).toBe(BatteryFull)
    expect(getBatteryIcon(100)).toBe(BatteryFull)
  })

  it('returns the medium icon between 40% and 79%', () => {
    expect(getBatteryIcon(40)).toBe(BatteryMedium)
    expect(getBatteryIcon(79)).toBe(BatteryMedium)
  })

  it('returns the low icon between 15% and 39%', () => {
    expect(getBatteryIcon(15)).toBe(BatteryLow)
    expect(getBatteryIcon(39)).toBe(BatteryLow)
  })

  it('returns the generic battery icon below 15%', () => {
    expect(getBatteryIcon(14)).toBe(Battery)
    expect(getBatteryIcon(0)).toBe(Battery)
  })
})

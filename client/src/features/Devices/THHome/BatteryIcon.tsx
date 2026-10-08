import {
    Battery,
    BatteryFull,
    BatteryMedium,
    BatteryLow,
    BatteryCharging,
} from 'lucide-react';

export function getBatteryIcon(
  percent: number | null | undefined,
  isCharging = false,
) {
  if (isCharging) return BatteryCharging;
  if (percent == null) return Battery;

  if (percent >= 80) return BatteryFull;
  if (percent >= 40) return BatteryMedium;
  if (percent >= 15) return BatteryLow;

  return Battery;
}
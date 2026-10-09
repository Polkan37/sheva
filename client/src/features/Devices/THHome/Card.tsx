
import { Thermometer, Droplet } from 'lucide-react';
import { getBatteryIcon } from './BatteryIcon'
import { Card } from '../../Card/Card';
import type { Device } from '../../../shared/api/devices';
import { useMeasurements } from '../../../shared/hooks/useMeasurements';
type THHomeCardProps = {
  device: Device;
};


export function THHomeCard({ device }: THHomeCardProps) {
  const { measurement } = useMeasurements(device.uid);

  const batteryPercent = measurement?.batteryPct;
  const BatteryIcon = getBatteryIcon(batteryPercent);

  return (
    <Card>
      <p>{device.name}</p>

      {device.description && (
        <span>{device.description}</span>
      )}

      <div className="data">
        <span title="temperature">
          <Thermometer size={24} strokeWidth={1} />

          {measurement
            ? `${measurement.temperatureC.toFixed(1)} °C`
            : '—'}
        </span>

        <span title="humidity">
          <Droplet size={24} strokeWidth={1} />

          {measurement
            ? `${measurement.humidityPct.toFixed(0)}%`
            : '—'}
        </span>
        <span className={batteryPercent <= 17 ? "red-text" : ""} title={batteryPercent <= 17 ? "low battery" : "battery"}>
          <BatteryIcon size={24} strokeWidth={1} />

          {batteryPercent != null
            ? `${batteryPercent.toFixed(0)}%`
            : '—'}
        </span>
      </div>
    </Card>
  );
}

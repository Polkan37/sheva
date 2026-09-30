import { useEffect, useState } from 'react';
import {
  Thermometer,
  Droplet,
  BatteryFull,
} from 'lucide-react';

import { Card } from '../../Card/Card';

import type { Device } from '../../../shared/api/devices';
import {
  getMeasurements,
  type Measurement,
} from '../../../shared/api/measurements';

type THHomeCardProps = {
  device: Device;
};

export function THHomeCard({
  device,
}: THHomeCardProps) {
  const [measurement, setMeasurement] =
    useState<Measurement | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadMeasurement() {
      try {
        const data = await getMeasurements({
          uid: device.uid,
          amount: 'latest',
        });

        if (!ignore) {
          setMeasurement(
            data.measurements[0] ?? null,
          );
        }
      } catch (error) {
        console.error(
          `Failed to load measurements for ${device.uid}`,
          error,
        );

        if (!ignore) {
          setMeasurement(null);
        }
      }
    }

    loadMeasurement();

    return () => {
      ignore = true;
    };
  }, [device.uid]);

  return (
    <Card key={device.uid}>
      <p>{device.name}</p>

      {device.description && (
        <span>{device.description}</span>
      )}

      <div className="data">
        <span title="temperature">
          <Thermometer
            size={24}
            strokeWidth={1}
          />

          {measurement
            ? `${measurement.temperatureC.toFixed(1)} °C`
            : '—'}
        </span>

        <span title="humidity">
          <Droplet
            size={24}
            strokeWidth={1}
          />

          {measurement
            ? `${measurement.humidityPct.toFixed(0)}%`
            : '—'}
        </span>

        <span title="battery">
          <BatteryFull
            size={24}
            strokeWidth={1}
          />

          {measurement?.batteryPct !== null &&
          measurement?.batteryPct !== undefined
            ? `${measurement.batteryPct.toFixed(0)}%`
            : '—'}
        </span>
      </div>
    </Card>
  );
}
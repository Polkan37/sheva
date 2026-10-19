
import { Power, PowerOff, CircleHelp } from 'lucide-react';

import { Card } from '../../Card/Card';
import type { Device } from '../../../shared/api/devices';
import { usePowerState } from '../../../shared/hooks/usePowerState';
import type { PowerStatus } from '../../../shared/api/power';

type Props = {
  device: Device;
};

const statusLabels: Record<PowerStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  unknown: 'Unknown',
};

const statusIcons = {
  online: Power,
  offline: PowerOff,
  unknown: CircleHelp,
};

export function SmartPlugCard({ device }: Props) {
  const { state, error } = usePowerState(device.uid);

  const status = error ? 'unknown' : (state?.status ?? 'unknown');
  const StatusIcon = statusIcons[status];

  return (
    <Card>
      <p>{device.name}</p>

      {device.description && (
        <span>{device.description}</span>
      )}

      <div className="data">
        <span
          className={
            status === 'offline'
              ? 'red-text'
              : status === 'online'
                ? 'green-text'
                : ''
          }
          title="Power status"
        >
          <StatusIcon size={14} strokeWidth={3} />
          {statusLabels[status]}
        </span>
      </div>
    </Card>
  );
}

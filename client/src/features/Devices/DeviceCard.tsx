

import { Card } from '../Card/Card';
import type { Device } from '../../shared/api/devices';

type DeviceCardProps = {
    device: Device;
};

export function DeviceCard({
    device,
}: DeviceCardProps) {

    return (
        <Card key={device.uid}>
            <p>{device.name}</p>

            {device.description && (
                <span>{device.description}</span>
            )}
        </Card>
    );
}
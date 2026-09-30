
import type { Device } from '../../shared/api/devices';


type DeviceCardProps = {
    device: Device;
};

export function DeviceContent({
    device,
}: DeviceCardProps) {

    return (
        <>
            <h2>{device.name}</h2>
            <p>
                {device.description}
            </p>

            <p>
                Room: {device.room?.name ?? 'Unknown'}
            </p>

            {/* analytics, charts, statistics etc */}
        </>
    );
}
import type { Device } from '../../shared/api/devices';
import { DeviceContent } from './DeviceContent';
import { THHomePage } from './THHome/Page';

type DevicePageListProps = {
    device: Device;
};

const deviceContentComponents = {
    environment_sensor: THHomePage,
    default: DeviceContent
} as const;

export function DevicePageList({
    device,
}: DevicePageListProps) {
    const ContentComponent =
        deviceContentComponents[
            device.type as keyof typeof deviceContentComponents 
        ] ?? deviceContentComponents.default;

    if (!ContentComponent) {
        return (
            <div>
                <h1>{device.name}</h1>
                <p>
                    No detailed view available for this device type.
                </p>
            </div>
        );
    }

    return (
        <ContentComponent
            device={device}
        />
    );
}
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

    return (
        <ContentComponent
            device={device}
        />
    );
}
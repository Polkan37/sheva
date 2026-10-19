import type { Device } from '../../shared/api/devices';
import { THHomeCard } from './THHome/Card';
import { DeviceCard } from './DeviceCard';
import { SmartPlugCard } from './SmartPlug/Card';
import { Link, useSearchParams } from 'react-router-dom';

type DeviceListProps = {
    devices: Device[];
};

const deviceComponents = {
    environment_sensor: THHomeCard,
    smart_plug: SmartPlugCard,
    default: DeviceCard,
} as const;

export function DeviceList({ devices }: DeviceListProps) {
    const [searchParams] = useSearchParams();
    const selectedUid = searchParams.get('uid');

    return (
        <>
            {
                devices.map((device) => {
                    const DeviceComponent = deviceComponents[
                        device.type as keyof typeof deviceComponents
                    ] ?? deviceComponents.default;
                    const isActive = device.uid === selectedUid;

                    return (
                        <Link className={isActive ? 'active' : ''} to={`/devices?uid=${device.uid}`} key={device.id} >
                            <DeviceComponent
                                device={device}
                            />
                        </Link >
                    );
                })
            }
        </>
    );
}
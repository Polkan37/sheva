import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDevices, type Device } from '../../shared/api/devices';
import { DeviceList } from '../../features/Devices/DeviceList';

import { DevicePageList } from '../../features/Devices/DevicePageList';

export function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const selectedUid = searchParams.get('uid');

    useEffect(() => {
        async function loadDevices() {
            try {
                const { devices } = await getDevices();

                setDevices(devices);
            } finally {
                setIsLoading(false);
            }
        }

        loadDevices();
    }, []);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    const selectedDevice =
        devices.find(
            (device) =>
                device.uid === selectedUid,
        ) ?? null;

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <section className='content page device-page'>
            <div className='container'>
                {selectedDevice ? (
                    <DevicePageList
                        device={selectedDevice}
                    />
                ) : (
                    <div>
                        <p className='help-text'>Select a device ➡</p>
                    </div>
                )}
            </div>

            <aside className='sidebar'>
                <DeviceList devices={devices} />
            </aside>
        </section>
    );
}
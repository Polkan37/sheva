import { useSearchParams } from 'react-router-dom'

import { useDevices } from '../../shared/hooks/useDevices'
import { DeviceList } from '../../features/Devices/DeviceList'
import { DevicePageList } from '../../features/Devices/DevicePageList'

export function DevicesPage() {
    const { devices, isLoading } = useDevices()

    const [searchParams] = useSearchParams()
    const selectedUid = searchParams.get('uid')

    const selectedDevice =
        devices.find((device) => device.uid === selectedUid) ?? null

    if (isLoading) {
        return <div>Loading...</div>
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
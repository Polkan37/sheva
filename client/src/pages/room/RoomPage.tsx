import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Integrations } from '../../features/Integrations/Integrations';
import { getRooms, type Room } from '../../shared/api/rooms';
import { getDevices, type Device } from '../../shared/api/devices';
import { DeviceList } from '../../features/Devices/DeviceList';

import styles from './RoomPage.module.css'

export function RoomPage() {
    const { slug } = useParams<{ slug: string }>();

    const [room, setRoom] = useState<Room | null>(null);
    const [devices, setDevices] = useState<Device[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadRoom() {
            try {
                const [
                    { rooms },
                    { devices },
                ] = await Promise.all([
                    getRooms(),
                    getDevices(),
                ]);

                const currentRoom = rooms.find(
                    (room) => room.slug === slug,
                );

                if (!currentRoom) {
                    setRoom(null);
                    return;
                }

                setRoom(currentRoom);

                setDevices(
                    devices.filter(
                        (device) =>
                            device.room?.id === currentRoom.id,
                    ),
                );

            } finally {
                setIsLoading(false);
            }
        }

        loadRoom();
    }, [slug]);



    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!room) {
        return <div>Room not found</div>;
    }

    return (
        <section className='content'>
            <div className='dashboard'>
                <div className='mainContent container'>
                    <img className={styles.image} src={`/${room.slug}.jpg`} alt="" />
                </div>

                <aside className='sidebar'>
                    <DeviceList devices={devices} />
                </aside>
            </div>

            <Integrations />
        </section>
    );
}
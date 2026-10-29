import type { Device } from '../../../shared/api/devices'
import { usePowerState } from '../../../shared/hooks/usePowerState'

import styles from './DevicesSettings.module.css'

type Props = {
  device: Device
}

export function DeviceStatus({ device }: Props) {
  if (device.type === 'smart_plug') {
    return <SmartPlugStatus uid={device.uid} />
  }

  return <Status status={device.online ? 'online' : 'offline'} />
}

function SmartPlugStatus({ uid }: { uid: string }) {
  const { state, error } = usePowerState(uid)

  const status = error ? 'unknown' : (state?.status ?? 'unknown')

  return <Status status={status} />
}

function Status({ status }: { status: 'online' | 'offline' | 'unknown' }) {
  return (
    <span
      className={`${styles.status} ${
        status === 'online'
          ? styles.online
          : status === 'offline'
            ? styles.offline
            : styles.unknown
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
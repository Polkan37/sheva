import { RoomsSettings } from '../../features/Settings/Rooms/RoomsSettings'
import { DevicesSettings } from '../../features/Settings/Devices/DevicesSettings'
import { IntegrationsSettings } from '../../features/Settings/Integrations/IntegrationsSettings'

import styles from './SettingsPage.module.css'

export function SettingsPage() {
  return (
    <section className={`content ${styles.settings}`}>
      <header className={styles.header}>
        <h1>Settings</h1>
      </header>

      <RoomsSettings />
      <DevicesSettings />
      <IntegrationsSettings />
    </section>
  )
}
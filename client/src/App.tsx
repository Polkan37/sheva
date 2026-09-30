import { Routes, Route } from 'react-router-dom'
import { Header } from './features/Header/Header'
import { HomePage } from './pages/home/HomePage'
import { DevicesPage } from './pages/devices/DevicesPage'
import { RoomPage } from './pages/room/RoomPage'
import { SettingsPage } from './pages/settings/SettingsPage'

export default function App() {
  return (
    <>
      <Header />

        <main className='main'>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          <Route path="/:slug" element={<RoomPage />} />
        </Routes>
      </main>
    </>
  )
}
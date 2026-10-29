
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, LoaderCircle } from 'lucide-react'

import {
  getDevices,
  createDevice,
  updateDevice,
  deleteDevice,
  type Device,
  type DeviceInput,
} from '../../../shared/api/devices'

import { getRooms, type Room } from '../../../shared/api/rooms'
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog/ConfirmDialog'
import { DeviceForm } from './DeviceForm'
import { DeviceStatus } from './DeviceStatus'

import styles from './DevicesSettings.module.css'

export function DevicesSettings() {
  const [devices, setDevices] = useState<Device[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      getDevices(controller.signal),
      getRooms(controller.signal),
    ])
      .then(([devicesResponse, roomsResponse]) => {
        setDevices(devicesResponse.devices)
        setRooms(roomsResponse.rooms)
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error ? err.message : 'Failed to load devices',
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  async function loadDevices() {
    const { devices } = await getDevices()
    setDevices(devices)
  }

  function openCreateForm() {
    setEditingDevice(null)
    setError(null)
    setIsFormOpen(true)
  }

  function openEditForm(device: Device) {
    setEditingDevice(device)
    setError(null)
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingDevice(null)
    setError(null)
  }

  async function handleSave(data: DeviceInput) {
    if (isSaving) return

    setIsSaving(true)
    setError(null)

    try {
      if (editingDevice) {
        await updateDevice(editingDevice.id, data)
      } else {
        await createDevice(data)
      }

      await loadDevices()
      closeForm()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save device',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deviceToDelete || isSaving) return

    setIsSaving(true)
    setError(null)

    try {
      await deleteDevice(deviceToDelete.id)

      setDevices((prev) =>
        prev.filter((device) => device.id !== deviceToDelete.id),
      )

      setDeviceToDelete(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete device',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <div>
          <h2>Devices</h2>
          <span>{devices.length} devices</span>
        </div>

        <button
          className={styles.primaryButton}
          onClick={openCreateForm}
        >
          <Plus size={18} />
          Add device
        </button>
      </header>

      {error && !isFormOpen && !deviceToDelete && (
        <p className={styles.error} role="alert">{error}</p>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <LoaderCircle className="spinner" size={28} />
        </div>
      ) : devices.length === 0 ? (
        <p className={styles.empty}>No devices added yet</p>
      ) : (
        <div className={styles.deviceList}>
          {devices.map((device) => (
            <div className={styles.device} key={device.id}>
              <div className={styles.deviceInfo}>
                <h3>{device.name}</h3>
                <span>{device.uid} · {device.type}</span>
                <span>
                  {device.room?.name ?? 'No room'}
                  {' · '}
                  {device.sampleIntervalSec}s interval
                </span>
              </div>

              <DeviceStatus device={device} />

              <div className={styles.actions}>
                <button
                  title="Edit"
                  aria-label={`Edit ${device.name}`}
                  onClick={() => openEditForm(device)}
                >
                  <Pencil size={17} />
                </button>

                <button
                  title="Delete"
                  aria-label={`Delete ${device.name}`}
                  onClick={() => {
                    setError(null)
                    setDeviceToDelete(device)
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isFormOpen && (
        <DeviceForm
          key={editingDevice?.id ?? 'new'}
          device={editingDevice}
          rooms={rooms}
          isSaving={isSaving}
          error={error}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}

      {deviceToDelete && (
        <ConfirmDialog
          title="Delete device?"
          message={`Are you sure you want to delete "${deviceToDelete.name}"? All its measurement and power outage history will be permanently deleted.`}
          isLoading={isSaving}
          error={error}
          onConfirm={handleDelete}
          onCancel={() => {
            setDeviceToDelete(null)
            setError(null)
          }}
        />
      )}
    </section>
  )
}

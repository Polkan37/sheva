
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, LoaderCircle } from 'lucide-react'

import {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  type Room,
  type RoomInput,
} from '../../../shared/api/rooms'

import { ConfirmDialog } from '../../../shared/components/ConfirmDialog/ConfirmDialog'
import { RoomForm } from './RoomForm'

import styles from './RoomsSettings.module.css'

export function RoomsSettings() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null)

  async function loadRooms(signal?: AbortSignal) {
    const { rooms } = await getRooms(signal)
    setRooms(rooms)
  }

  useEffect(() => {
    const controller = new AbortController()

    getRooms(controller.signal)
      .then(({ rooms }) => setRooms(rooms))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError('Failed to load rooms')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  function openCreateForm() {
    setEditingRoom(null)
    setError(null)
    setIsFormOpen(true)
  }

  function openEditForm(room: Room) {
    setEditingRoom(room)
    setError(null)
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingRoom(null)
    setError(null)
  }

  async function handleSave(data: RoomInput) {
    if (isSaving) return

    setIsSaving(true)
    setError(null)

    try {
      if (editingRoom) {
        await updateRoom(editingRoom.id, data)
      } else {
        await createRoom(data)
      }

      await loadRooms()
      closeForm()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save room',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!roomToDelete || isSaving) return

    setIsSaving(true)
    setError(null)

    try {
      await deleteRoom(roomToDelete.id)
      setRooms((prev) =>
        prev.filter((room) => room.id !== roomToDelete.id),
      )
      setRoomToDelete(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete room',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <div>
          <h2>Rooms</h2>
          <span>{rooms.length} rooms</span>
        </div>

        <button
          className={styles.primaryButton}
          onClick={openCreateForm}
        >
          <Plus size={18} />
          Add room
        </button>
      </header>

      {error && !isFormOpen && (
        <p role="alert" className={styles.error}>{error}</p>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <LoaderCircle className="spinner" size={28} />
        </div>
      ) : rooms.length === 0 ? (
        <p className={styles.empty}>No rooms added yet</p>
      ) : (
        <div className={styles.roomList}>
          {[...rooms]
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((room) => (
              <div className={styles.room} key={room.id}>
                <div className={styles.roomInfo}>
                  <h3>{room.name}</h3>
                  <span>
                    /{room.slug} · Order {room.displayOrder}
                  </span>
                </div>

                <div className={styles.roomValues}>
                  <span>
                    {room.temperature === null
                      ? '—'
                      : `${room.temperature.toFixed(1)} °C`}
                  </span>
                  <span>
                    {room.humidity === null
                      ? '—'
                      : `${room.humidity.toFixed(0)} %`}
                  </span>
                </div>

                <div className={styles.actions}>
                  <button
                    aria-label={`Edit ${room.name}`}
                    title="Edit"
                    onClick={() => openEditForm(room)}
                  >
                    <Pencil size={17} />
                  </button>

                  <button
                    aria-label={`Delete ${room.name}`}
                    title="Delete"
                    onClick={() => {
                      setError(null)
                      setRoomToDelete(room)
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
        <RoomForm
          room={editingRoom}
          defaultOrder={rooms.length}
          isSaving={isSaving}
          error={error}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}

      {roomToDelete && (
        <ConfirmDialog
          title="Delete room?"
          message={`Are you sure you want to delete "${roomToDelete.name}"? Devices assigned to this room will remain available.`}
          isLoading={isSaving}
          onConfirm={handleDelete}
          onCancel={() => setRoomToDelete(null)}
        />
      )}
    </section>
  )
}

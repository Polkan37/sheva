import { useEffect, useState } from 'react'
import { getDevices, type Device } from '../api/devices'

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    getDevices(controller.signal)
      .then(({ devices }) => {
        setDevices(devices)
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Failed to load devices:', error)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  return { devices, isLoading }
}
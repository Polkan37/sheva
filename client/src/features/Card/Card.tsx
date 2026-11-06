import type { HTMLAttributes, PropsWithChildren } from 'react'
import { Thermometer, Droplet } from 'lucide-react'

import type { Room } from '../../shared/api/rooms'
import { formatTemperature, formatPercentage } from '../../shared/lib/format'
import styles from './Card.module.css'

type BaseCardProps = PropsWithChildren<
  HTMLAttributes<HTMLElement> & {
    active?: boolean
  }
>

type CardProps = BaseCardProps & {
  room?: Room
}

export function Card({
  children,
  className = '',
  active = false,
  room,
  ...props
}: CardProps) {
  const cardClassName = [
    styles.card,
    active ? styles.active : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cardClassName} {...props}>
      {room ? (
        <>
          <p>{room.name}</p>

          <div className={styles.data}>
            {room.temperature && (
              <span title="temperature">
                <Thermometer
                  size={18}
                  strokeWidth={1}
                />

                {/* the outer `room.temperature &&` guard already excludes
                null/undefined, so the ?? fallback here is unreachable */}
                {formatTemperature(
                  /* v8 ignore next */
                  room.temperature ?? undefined,
                )}
              </span>
            )}

            {room.humidity && (
              <span title="humidity">
                <Droplet
                  size={18}
                  strokeWidth={1}
                />

                {/* the outer `room.humidity &&` guard already excludes
                null/undefined, so the ?? fallback here is unreachable */}
                {formatPercentage(
                  /* v8 ignore next */
                  room.humidity ?? undefined,
                )}
              </span>
            )}
          </div>
        </>
      ) : (
        children
      )}
    </div>
  )
}

import { useState } from 'react'

import type { YasnoIntegration } from '../../../entities/Integration/types'
import { formatAddress, formatDate } from '../../../shared/lib/format'
import styles from './Page.module.css'

type Props = {
  integration: YasnoIntegration
}

type DayType = 'today' | 'tomorrow'


function getSlotForHour(
  slots: YasnoIntegration['schedule']['today']['slots'],
  hour: number
) {
  const start = hour * 60
  const end = start + 60

  return slots.find(
    (slot) => slot.start < end && slot.end > start
  )
}


export default function YasnoPage({ integration }: Props) {
  const [selectedDay, setSelectedDay] = useState<DayType>('today')

  const {
    group,
    provider,
    address,
    status,
    schedule,
    lastError,
  } = integration

  const day = schedule[selectedDay]

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.provider}>
            {provider} &nbsp;
            <span className={styles.group}>
              Група {group}
            </span></span>

          <h1>Графік відключень</h1>

          {address && (
            <p className={styles.address}>
              {formatAddress(address)}
            </p>
          )}
        </div>

        <div className={styles.infoCard}>
          <span className={styles.label}>Статус</span>

          <strong>
            {status === 'NoOutages'
              ? 'Відключень немає'
              : 'Можливі відключення'}
          </strong>
        </div>
      </header>

      {lastError && (
        <div className={styles.error}>
          Не вдалося оновити графік: {lastError}
        </div>
      )}

      <div className={styles.schedule}>
        <div className={styles.scheduleHeader}>
          <div>
            <h2>Графік</h2>

            <p>{formatDate(day.date)}</p>
          </div>

          <div className={styles.daySwitch}>
            <button
              className={
                selectedDay === 'today'
                  ? styles.activeDay
                  : ''
              }
              onClick={() => setSelectedDay('today')}
            >
              Сьогодні
            </button>

            <button
              className={
                selectedDay === 'tomorrow'
                  ? styles.activeDay
                  : ''
              }
              onClick={() => setSelectedDay('tomorrow')}
            >
              Завтра
            </button>
          </div>
        </div>

        <div className={styles.hours}>
          {Array.from({ length: 24 }, (_, hour) => {
            const slot = getSlotForHour(day.slots, hour)

            const type = slot?.type ?? 'NoOutages'

            return (
              <div
                key={hour}
                className={`${styles.hour} ${styles[type]}`}
              >
                <span className={styles.icon}>
                  {type === 'Definite' ? '↯' : '⚡'}
                </span>

                <span>
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
            )
          })}
        </div>

        <div className={styles.legend}>
          <div>
            <span
              className={`${styles.legendDot} ${styles.light}`}
            />
            Є світло
          </div>

          <div>
            <span
              className={`${styles.legendDot} ${styles.outage}`}
            />
            Немає світла
          </div>

          <div>
            <span
              className={`${styles.legendDot} ${styles.possible}`}
            />
            Можливе відключення
          </div>
        </div>
      </div>
    </section>
  )
}
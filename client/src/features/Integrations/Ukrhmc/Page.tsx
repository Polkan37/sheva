import { Droplets, Gauge, Navigation, Umbrella, Wind } from 'lucide-react'

import type { WeatherIntegration } from '../../../entities/Integration/types'
import { formatUpdatedAt, formatCondition, getWeatherIcon } from './helpers'
import { formatDate } from '../../../shared/lib/format'

import styles from './Page.module.css'

type Props = {
    integration: WeatherIntegration
}

export default function WeatherPage({
    integration,
}: Props) {
    const { city, current, forecast, updatedAt, lastError } = integration;

    const infoItems = [
        {
            label: 'Вологість',
            value: `${current.humidity}%`,
            icon: Droplets,
        },
        {
            label: 'Тиск',
            value: `${current.pressure} hPa`,
            icon: Gauge,
        },
        {
            label: 'Опади',
            value: `${current.precipitation} mm`,
            icon: Umbrella,
        },
        {
            label: 'Вітер',
            value: `${current.windSpeed} m/s`,
            icon: Wind,
        },
        {
            label: 'Напрямок',
            value: `${current.windDirection}°`,
            icon: Navigation,
        },
        {
            label: 'Точка роси',
            value: `${current.dewPoint}°`,
            icon: Droplets,
        },
    ]

    return (
        <section className={styles.page}>
            <header className={styles.header}>
                <div>
                    <span className={styles.provider}>
                        UkrHMC
                    </span>

                    <h1>Погода</h1>

                    <p className={styles.location}>
                        {city}
                    </p>
                </div>

                <div className={styles.updated}>
                    <span className={styles.label}>
                        Оновлено
                    </span>

                    <strong>
                        {formatUpdatedAt(updatedAt)}
                    </strong>
                </div>
            </header>

            {lastError && (
                <div className={styles.error}>
                    Не вдалося оновити погоду: {lastError}
                </div>
            )}

            <div className={styles.currentWeather}>
                <div className={styles.mainWeather}>
                    <span
                        className={styles.mainIcon}
                        role="img"
                        aria-label={current.condition}
                    >
                        {getWeatherIcon(
                            current.conditionCode,
                            current.isNight,
                        )}
                    </span>

                    <div>
                        <div className={styles.temperature}>
                            {Math.round(current.temperature)}°
                        </div>

                        <div className={styles.condition}>
                            {formatCondition(current.condition)}
                        </div>
                    </div>
                </div>

                <div className={styles.infoGrid}>
                    {infoItems.map((item) => {
                        const Icon = item.icon

                        return (
                            <div key={item.label} className={styles.infoCard}>
                                <div className={styles.infoHeader}>
                                    <Icon size={20} strokeWidth={1.5} />
                                    <span>{item.label}</span>
                                </div>

                                <strong>{item.value}</strong>
                            </div>
                        )
                    })}
                </div>
            </div>

            <section className={styles.forecast}>
                <div className={styles.forecastHeader}>
                    <div>
                        <h2>Прогноз</h2>

                        <p>Наступні дні</p>
                    </div>
                </div>

                <div className={styles.forecastGrid}>
                    {forecast.map((day) => (
                        <article
                            key={day.date}
                            className={styles.forecastCard}
                        >
                            <div>
                                <h3>
                                    {formatDate(day.date)}
                                </h3>

                                <p>
                                    {formatCondition(day.condition)}
                                </p>
                            </div>

                            <span
                                className={styles.forecastIcon}
                                role="img"
                                aria-label={day.condition}
                            >
                                {getWeatherIcon(
                                    day.conditionCode,
                                    false,
                                )}
                            </span>

                            <div className={styles.forecastTemperature}>
                                <strong>
                                    {Math.round(day.temperatureMax)}°
                                </strong>

                                <span>
                                    {Math.round(day.temperatureMin)}°
                                </span>
                            </div>

                            <div className={styles.precipitation}>
                                <Umbrella
                                    size={16}
                                    strokeWidth={1.5}
                                />

                                {day.precipitation} mm
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </section>
    )
}
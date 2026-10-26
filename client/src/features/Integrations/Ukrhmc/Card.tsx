import styles from "./Card.module.css";
import type { WeatherIntegration } from "../../../entities/Integration/types";
import { formatCondition, formatPrecipitation, formatWind, formatUpdatedAt, formatForecastLabel, getWeatherIcon } from "./helpers";

type WeatherCardProps = {
    integration: WeatherIntegration;
};

export default function WeatherCard({
    integration,
}: WeatherCardProps) {
    const { city, current, forecast, updatedAt } = integration;
    

    return (
        <article className={styles.card}>
            <div className={styles.top}>
                <div className={styles.iconBlock}>
                    <div className={styles.mainIcon}>
                        {getWeatherIcon(current.conditionCode, current.isNight)}
                    </div>
                </div>

                <div className={styles.currentBlock}>
                    <div className={styles.temperature}>
                        {Math.round(current.temperature)}°C
                    </div>

                    <div className={styles.condition}>
                        {formatCondition(current.condition)}
                    </div>
                </div>

                <div className={styles.metrics}>
                    <div className={styles.metric}>
                        <div className={styles.metricValue}>
                            💧 {current.humidity}%
                        </div>
                    </div>

                    <div className={styles.metric}>
                        <div className={styles.metricValue}>
                            💦 {formatPrecipitation(current.precipitation)}
                        </div>
                    </div>

                    <div className={styles.metric}>
                        <div className={styles.metricValue}>
                            💨 {formatWind(current.windSpeed)}
                        </div>
                    </div>
                </div>
            </div>


            <div className={styles.forecastList}>
                {forecast.slice(0, 3).map((day, index) => (
                    <div
                        key={day.date}
                        className={styles.forecastCard}
                    >
                        <div className={styles.forecastDay}>
                            {formatForecastLabel(day.date, index)}
                        </div>

                        <div className={styles.forecast}>
                            <span className={styles.forecastIcon}>
                                {getWeatherIcon(day.conditionCode, false)}
                            </span>
                            <span>
                                {Math.round(day.temperatureMax)}°/
                                {Math.round(day.temperatureMin)}°
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.meta}>
                <span>{city}</span>
                <span className={styles.dot}>•</span>
                <span>{formatUpdatedAt(updatedAt)}</span>
            </div>
        </article>
    );
}
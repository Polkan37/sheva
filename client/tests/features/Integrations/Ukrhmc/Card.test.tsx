import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { makeWeatherIntegration } from '@tests/factories'
import WeatherCard from '@/features/Integrations/Ukrhmc/Card'

describe('WeatherCard', () => {
  it('renders the current temperature, condition and metrics', () => {
    render(
      <WeatherCard
        integration={makeWeatherIntegration({
          current: {
            temperature: 5.6,
            condition: 'clear_sky',
            conditionCode: 1,
            humidity: 70,
            pressure: 1012,
            precipitation: 0.3,
            windSpeed: 2.5,
            windDirection: 90,
            windCompass: 'E',
            dewPoint: 0,
            isNight: false,
          },
        })}
      />,
    )

    expect(screen.getByText('6°C')).toBeInTheDocument()
    expect(screen.getByText('Clear sky')).toBeInTheDocument()
    expect(screen.getByText(/70%/)).toBeInTheDocument()
  })

  it('shows only the first three forecast days', () => {
    render(
      <WeatherCard
        integration={makeWeatherIntegration({
          forecast: [
            { date: '2026-01-15', temperatureMin: 1, temperatureMax: 5, condition: 'clear', conditionCode: 1, precipitation: 0 },
            { date: '2026-01-16', temperatureMin: 2, temperatureMax: 6, condition: 'clear', conditionCode: 1, precipitation: 0 },
            { date: '2026-01-17', temperatureMin: 3, temperatureMax: 7, condition: 'clear', conditionCode: 1, precipitation: 0 },
            { date: '2026-01-18', temperatureMin: 4, temperatureMax: 8, condition: 'clear', conditionCode: 1, precipitation: 0 },
          ],
        })}
      />,
    )

    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Tomorrow')).toBeInTheDocument()
    expect(screen.queryByText('8°/4°')).not.toBeInTheDocument()
  })

  it('renders the city and updated-at meta line', () => {
    render(<WeatherCard integration={makeWeatherIntegration({ city: 'Lviv' })} />)
    expect(screen.getByText('Lviv')).toBeInTheDocument()
  })
})

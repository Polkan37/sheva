import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { makeWeatherIntegration } from '@tests/factories'
import WeatherPage from '@/features/Integrations/Ukrhmc/Page'

describe('WeatherPage', () => {
  it('renders the current conditions and info grid', () => {
    render(
      <WeatherPage
        integration={makeWeatherIntegration({
          city: 'Odesa',
          current: {
            temperature: 12.7,
            condition: 'light_rain',
            conditionCode: 34,
            humidity: 80,
            pressure: 1005,
            precipitation: 1.2,
            windSpeed: 4,
            windDirection: 200,
            windCompass: 'SW',
            dewPoint: 9,
            isNight: false,
          },
        })}
      />,
    )

    expect(screen.getByText('Odesa')).toBeInTheDocument()
    expect(screen.getByText('13°')).toBeInTheDocument()
    expect(screen.getByText('Light rain')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('1005 hPa')).toBeInTheDocument()
  })

  it('shows the lastError banner when present', () => {
    render(<WeatherPage integration={makeWeatherIntegration({ lastError: 'fetch failed' })} />)
    expect(screen.getByText(/fetch failed/)).toBeInTheDocument()
  })

  it('omits the error banner when there is no error', () => {
    render(<WeatherPage integration={makeWeatherIntegration({ lastError: null })} />)
    expect(screen.queryByText(/Не вдалося оновити погоду/)).not.toBeInTheDocument()
  })

  it('renders every forecast day (no slicing)', () => {
    render(
      <WeatherPage
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

    expect(screen.getByText('8°')).toBeInTheDocument()
  })
})

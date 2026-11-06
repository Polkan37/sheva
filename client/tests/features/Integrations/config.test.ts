import { describe, expect, it } from 'vitest'
import { integrationConfig } from '@/features/Integrations/config'
import YasnoCard from '@/features/Integrations/Yasno/Card'
import YasnoPage from '@/features/Integrations/Yasno/Page'
import WeatherCard from '@/features/Integrations/Ukrhmc/Card'
import WeatherPage from '@/features/Integrations/Ukrhmc/Page'

describe('integrationConfig', () => {
  it('maps yasno to the Yasno card and page', () => {
    expect(integrationConfig.yasno.Card).toBe(YasnoCard)
    expect(integrationConfig.yasno.Page).toBe(YasnoPage)
  })

  it('maps ukrhmc to the weather card and page', () => {
    expect(integrationConfig.ukrhmc.Card).toBe(WeatherCard)
    expect(integrationConfig.ukrhmc.Page).toBe(WeatherPage)
  })
})

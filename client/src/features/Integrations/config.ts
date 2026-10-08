import WeatherCard from './Ukrhmc/Card'
import WeatherPage from './Ukrhmc/Page'
import YasnoCard from './Yasno/Card'
import YasnoPage from './Yasno/Page'

export const integrationConfig = {
  yasno: {
    Card: YasnoCard,
    Page: YasnoPage,
  },
  ukrhmc: {
    Card: WeatherCard,
    Page: WeatherPage, 
  }
}
export interface YasnoScheduleSlot {
  start: number;
  end: number;
  type: "Definite" | "NotPlanned" | string;
}

export interface YasnoScheduleDay {
  slots: YasnoScheduleSlot[];
  date: string;
  status: string;
  source: 'live' | 'cached' | 'unavailable';
  updatedAt: string | null;
}

export interface YasnoSchedule {
  today: YasnoScheduleDay;
  tomorrow: YasnoScheduleDay;
  updatedOn: string;
}

export type YasnoIntegration = {
  id: string;
  uid: "yasno";
  name: string;
  description: string | null;

  type: string;
  enabled: boolean;

  group: string;
  provider: string;

  status: string | null;
  availability: 'ready' | 'degraded';
  nextShutdownTime: number | null;
  nextRestoreTime: number | null;

  scheduleUpdatedAt: string | null;

  schedule: YasnoSchedule;

  address: {
    street: string
    house: string
  } | null;

  lastSyncAt: string | null;
  lastError: string | null;
};


export type IntegrationFailure = {
  id: string;
  uid: string;
  name: string;
  type: string;
  description: string | null;
  enabled: boolean;
  status: string;
  lastSyncAt: string | null;
  lastError: string;
  availability: 'error';
};


export type Integration =
  | YasnoIntegration
  | WeatherIntegration
  | IntegrationFailure;

export type IntegrationsResponse = {
  integrations: Integration[];
};

type WeatherCurrent = {
  temperature: number;
  condition: string;
  conditionCode: number;
  humidity: number;
  pressure: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  windCompass: string;
  dewPoint: number;
  isNight: boolean;
};

type WeatherForecastDay = {
  date: string;
  temperatureMin: number;
  temperatureMax: number;
  condition: string;
  conditionCode: number;
  precipitation: number;
};

export type WeatherIntegration = {
  id: string;
  uid: "ukrhmc";
  name: string;
  description: string | null;

  type: "weather";
  enabled: boolean;

  availability: 'ready' | 'degraded';
  city: string;
  current: WeatherCurrent;
  forecast: WeatherForecastDay[];
  updatedAt: string;

  lastSyncAt: string | null;
  lastError: string | null;
};
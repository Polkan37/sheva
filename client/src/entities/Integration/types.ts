export interface YasnoScheduleSlot {
  start: number;
  end: number;
  type: "Definite" | "NotPlanned" | string;
}

export interface YasnoScheduleDay {
  slots: YasnoScheduleSlot[];
  date: number;
  status: string;
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

export type Integration =
  | YasnoIntegration
  | WeatherIntegration;

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

  city: string;
  current: WeatherCurrent;
  forecast: WeatherForecastDay[];
  updatedAt: string;

  lastSyncAt: string | null;
  lastError: string | null;
};
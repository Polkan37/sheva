export type Measurement = {
  id: number;
  sequence: number | null;
  capturedAt: string | null;
  receivedAt: string;

  temperatureC: number;
  humidityPct: number;

  batteryVoltage: number | null;
  batteryPct: number | null;
  rssiDbm: number | null;

  firmwareVersion: string | null;
};

export type MeasurementsResponse = {
  totalRecords: number;
  startNumber: number;
  returnedRecords: number;
  nextStartNumber: number | null;
  measurements: Measurement[];
};

export type MeasurementsAmount = 'latest' | number;

type GetMeasurementsParams = {
  uid: string;
  amount: MeasurementsAmount;
  startNumber?: number;
};

export async function getMeasurements({
  uid,
  amount,
  startNumber,
}: GetMeasurementsParams): Promise<MeasurementsResponse> {
  const params = new URLSearchParams({
    amount: String(amount),
  });

  if (startNumber !== undefined) {
    params.set('startNumber', String(startNumber));
  }

  const response = await fetch(
    `/api/devices/${uid}/measurements?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Failed to load measurements');
  }

  return response.json();
}
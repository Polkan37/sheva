
export type Device = {
  id: string;
  uid: string;
  name: string;
  description: string;
  type: string;

  room: {
    id: string;
    name: string;
  } | null;

  sampleIntervalSec: number;
  firmwareVersion: string | null;
  lastSeenAt: string | null;
  online: boolean;
};

export type DevicesResponse = {
  devices: Device[];
};

export async function getDevices(signal?: AbortSignal): Promise<DevicesResponse> {
  const response = await fetch('/api/devices/', {
    signal,
  });

  if (!response.ok) {
    throw new Error('Failed to load devices');
  }

  return response.json();
}
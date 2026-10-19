
import { apiFetch } from './client';

export type PowerStatus = 'online' | 'offline' | 'unknown';
export type PowerRange = '24h' | '7d' | '30d';

export type PowerState = {
  deviceUid: string;
  status: PowerStatus;
  since: string | null;
  lastCheckedAt: string | null;
};

export type PowerPeriod = {
  id: number;
  status: PowerStatus;
  startedAt: string;
  endedAt: string | null;
};

export type PowerHistory = {
  deviceUid: string;
  from: string;
  to: string;
  periods: PowerPeriod[];
};

export function getPowerState(
  uid: string,
  signal?: AbortSignal,
): Promise<PowerState> {
  return apiFetch<PowerState>(
    `/api/devices/${encodeURIComponent(uid)}/power`,
    signal,
  );
}

export function getPowerHistory(
  uid: string,
  range: PowerRange,
  signal?: AbortSignal,
): Promise<PowerHistory> {
  return apiFetch<PowerHistory>(
    `/api/devices/${encodeURIComponent(uid)}/power/history?range=${range}`,
    signal,
  );
}

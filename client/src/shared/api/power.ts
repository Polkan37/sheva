
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

export type PowerHistoryFilter =
  | PowerRange
  | { from: string; to: string };

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
  period: PowerHistoryFilter,
  signal?: AbortSignal,
): Promise<PowerHistory> {
  const params = new URLSearchParams();

  if (typeof period === 'string') {
    params.set('range', period);
  } else {
    params.set('from', period.from);
    params.set('to', period.to);
  }

  return apiFetch<PowerHistory>(
    `/api/devices/${encodeURIComponent(uid)}/power/history?${params}`,
    signal,
  );
}


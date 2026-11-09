
import {
  getLatestScheduleGroup,
  getSavedSchedule,
  saveSchedule,
} from './yasnoScheduleRepository.js';

const API_BASE =
  "https://app.yasno.ua/api/blackout-service/public/shutdowns";

const STREETS_URL =
  `${API_BASE}/addresses/v2/streets`;

const HOUSES_URL =
  `${API_BASE}/addresses/v2/houses`;

const GROUP_URL =
  `${API_BASE}/addresses/v2/group`;

const REQUEST_TIMEOUT_MS = 10_000;

type YasnoStatus =
  | "NoOutages"
  | "ScheduleApplies"
  | "WaitingForSchedule"
  | "EmergencyShutdowns"
  | string;

type YasnoSlotType =
  | "Definite"
  | "NotPlanned"
  | string;

interface YasnoLookupItem {
  id: number;
  value: string;
}

interface YasnoGroupResponse {
  group: number | string;
  subgroup: number | string;
}

interface NextOutageTimes {
  nextShutdownTime: number | null;
  nextRestoreTime: number | null;
}

export interface YasnoSlot {
  start: number;
  end: number;
  type: YasnoSlotType;
}

export type ScheduleSource =
  | 'live'
  | 'cached'
  | 'unavailable';

export interface YasnoDaySchedule {
  slots: YasnoSlot[];
  date: string;
  status: YasnoStatus;
  source?: ScheduleSource;
  updatedAt?: string | null;
}

export interface YasnoGroupSchedule {
  today: YasnoDaySchedule;
  tomorrow: YasnoDaySchedule;
  updatedOn: string;
}

type YasnoPlannedOutagesResponse =
  Record<string, YasnoGroupSchedule>;

interface ResolvedAddress {
  streetId: number;
  houseId: number;

  street: string;
  house: string;
}

export interface YasnoIntegrationData {
  group: string;
  provider: string;
  status: YasnoStatus | null;

  nextShutdownTime: number | null;
  nextRestoreTime: number | null;

  lastSyncAt: string | null;
  lastError: string | null;

  schedule: YasnoGroupSchedule;

  address: {
    street: string;
    house: string;
  } | null;
}

/*
 * We keep resolved Yasno IDs in memory.
 *
 * They are technical API identifiers and don't need
 * to be resolved from street/house names on every sync.
 */
let resolvedAddressCache:
  | ResolvedAddress
  | null = null;


function getConfig() {
  const regionId = Number(
    process.env.YASNO_REGION_ID,
  );

  const dsoId = Number(
    process.env.YASNO_DSO_ID,
  );

  const street =
    process.env.YASNO_STREET?.trim();

  const house =
    process.env.YASNO_HOUSE?.trim();

  if (
    !regionId ||
    !dsoId ||
    !street ||
    !house
  ) {
    throw new Error(
      "Missing Yasno configuration. " +
      "Check YASNO_REGION_ID, " +
      "YASNO_DSO_ID, " +
      "YASNO_STREET and YASNO_HOUSE.",
    );
  }

  return {
    regionId,
    dsoId,
    street,
    house,
  };
}


async function fetchJson<T>(
  url: string,
): Promise<T> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

  try {
    const response = await fetch(
      url,
      {
        signal: controller.signal,

        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Yasno API returned ${response.status} ${response.statusText}`,
      );
    }

    return await response.json() as T;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "Yasno API request timed out",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}


function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("uk-UA")
    .replace(/\s+/g, " ");
}


function findBestMatch(
  items: YasnoLookupItem[],
  expected: string,
): YasnoLookupItem {
  if (!items.length) {
    throw new Error(
      `Yasno lookup returned no results for "${expected}"`,
    );
  }

  const normalizedExpected =
    normalize(expected);

  const exact = items.find(
    (item) =>
      normalize(item.value) ===
      normalizedExpected,
  );

  if (exact) {
    return exact;
  }

  const contains = items.filter(
    (item) =>
      normalize(item.value).includes(
        normalizedExpected,
      ),
  );

  if (contains.length === 1) {
    return contains[0]!;
  }

  throw new Error(
    `Could not uniquely resolve "${expected}". ` +
    `Yasno returned: ${items
      .map((item) => item.value)
      .join(", ")}`,
  );
}


async function resolveStreetId(
  regionId: number,
  dsoId: number,
  street: string,
): Promise<YasnoLookupItem> {
  const params =
    new URLSearchParams({
      regionId:
        String(regionId),

      dsoId:
        String(dsoId),

      query:
        street,
    });

  const streets =
    await fetchJson<
      YasnoLookupItem[]
    >(
      `${STREETS_URL}?${params.toString()}`,
    );

  return findBestMatch(
    streets,
    street,
  );
}


async function resolveHouseId(
  regionId: number,
  dsoId: number,
  streetId: number,
  house: string,
): Promise<YasnoLookupItem> {
  const params =
    new URLSearchParams({
      regionId:
        String(regionId),

      dsoId:
        String(dsoId),

      streetId:
        String(streetId),

      query:
        house,
    });

  const houses =
    await fetchJson<
      YasnoLookupItem[]
    >(
      `${HOUSES_URL}?${params.toString()}`,
    );

  return findBestMatch(
    houses,
    house,
  );
}


async function resolveAddress():
  Promise<ResolvedAddress> {
  if (resolvedAddressCache) {
    return resolvedAddressCache;
  }

  const {
    regionId,
    dsoId,
    street,
    house,
  } = getConfig();

  const streetResult =
    await resolveStreetId(
      regionId,
      dsoId,
      street,
    );

  const houseResult =
    await resolveHouseId(
      regionId,
      dsoId,
      streetResult.id,
      house,
    );

  resolvedAddressCache = {
    streetId:
      streetResult.id,

    houseId:
      houseResult.id,

    street:
      streetResult.value,

    house:
      houseResult.value,
  };

  return resolvedAddressCache;
}


async function resolveGroup(
  regionId: number,
  dsoId: number,
  streetId: number,
  houseId: number,
): Promise<string> {
  const params =
    new URLSearchParams({
      regionId:
        String(regionId),

      dsoId:
        String(dsoId),

      streetId:
        String(streetId),

      houseId:
        String(houseId),
    });

  const data =
    await fetchJson<
      YasnoGroupResponse
    >(
      `${GROUP_URL}?${params.toString()}`,
    );

  if (
    data.group === undefined ||
    data.subgroup === undefined
  ) {
    throw new Error(
      "Yasno group response is missing group/subgroup",
    );
  }

  return (
    `${data.group}.${data.subgroup}`
  );
}


async function fetchSchedule(
  regionId: number,
  dsoId: number,
): Promise<YasnoPlannedOutagesResponse> {
  const url =
    `${API_BASE}` +
    `/regions/${regionId}` +
    `/dsos/${dsoId}` +
    `/planned-outages`;

  return fetchJson<
    YasnoPlannedOutagesResponse
  >(url);
}


function minutesToTimestamp(
  date: string,
  minutes: number,
): number {
  const startOfDay =
    new Date(date);

  return (
    startOfDay.getTime() +
    minutes * 60_000
  );
}


interface OutagePeriod {
  start: number;
  end: number;
}


function getOutagePeriods(
  schedule: YasnoGroupSchedule,
): OutagePeriod[] {
  const days = [
    schedule.today,
    schedule.tomorrow,
  ];

  const periods:
    OutagePeriod[] = [];

  for (const day of days) {
    for (
      const slot
      of day.slots ?? []
    ) {
      if (
        slot.type !==
        "Definite"
      ) {
        continue;
      }

      periods.push({
        start:
          minutesToTimestamp(
            day.date,
            slot.start,
          ),

        end:
          minutesToTimestamp(
            day.date,
            slot.end,
          ),
      });
    }
  }

  return periods.sort(
    (a, b) =>
      a.start - b.start,
  );
}


function getNextOutageTimes(
  schedule: YasnoGroupSchedule,
  now = Date.now(),
): NextOutageTimes {
  const periods = getOutagePeriods(schedule);

  const current = periods.find(
    (period) =>
      period.start <= now &&
      now < period.end,
  );

  if (current) {
    return {
      nextShutdownTime: null,
      nextRestoreTime: current.end,
    };
  }

  const next = periods.find(
    (period) => period.start > now,
  );

  if (!next) {
    return {
      nextShutdownTime: null,
      nextRestoreTime: null,
    };
  }

  return {
    nextShutdownTime: next.start,
    nextRestoreTime: next.end,
  };
}

function getScheduleDates(now = new Date()) {
  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const nextDate = new Date(`${today}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  return {
    today,
    tomorrow: nextDate.toISOString().slice(0, 10),
  };
}


function isValidDay(
  day: YasnoDaySchedule | undefined,
  expectedDate: string,
): day is YasnoDaySchedule {
  if (
    !day ||
    day.date.slice(0, 10) !== expectedDate ||
    !Array.isArray(day.slots) ||
    ['EmergencyShutdowns', 'WaitingForSchedule'].includes(
      day.status,
    )
  ) {
    return false;
  }

  if (day.status === 'NoOutages' || day.status === 'NoShutdowns') {
    return day.slots.length === 0 ||
      day.slots.every(slot => slot.type === 'NotPlanned');
  }

  return day.slots.length > 0 &&
    day.slots.every(slot =>
      Number.isFinite(slot.start) &&
      Number.isFinite(slot.end) &&
      slot.start >= 0 &&
      slot.end <= 1440 &&
      slot.start < slot.end &&
      typeof slot.type === 'string'
    );
}


function resolveDaySchedule(
  integrationId: string,
  group: string,
  date: string,
  liveDay?: YasnoDaySchedule,
  updatedOn: string | null = null,
): YasnoDaySchedule {
  if (isValidDay(liveDay, date)) {
    const normalizedDay = {
      ...liveDay,
      date,
    };

    saveSchedule({
      integrationId,
      group,
      day: normalizedDay,
      updatedOn,
    });

    return {
      ...normalizedDay,
      source: 'live',
      updatedAt: updatedOn,
    };
  }

  const cached = getSavedSchedule(
    integrationId,
    group,
    date,
  );

  if (cached) {
    return {
      date,
      slots: cached.slots,
      status: cached.status,
      source: 'cached',
      updatedAt: cached.updatedOn ??
        cached.fetchedAt.toISOString(),
    };
  }

  return {
    date,
    slots: [],
    status: 'WaitingForSchedule',
    source: 'unavailable',
    updatedAt: null,
  };
}

function buildSchedule(
  integrationId: string,
  group: string,
  dates: ReturnType<typeof getScheduleDates>,
  liveSchedule?: YasnoGroupSchedule,
): YasnoGroupSchedule {
  const updatedOn = liveSchedule?.updatedOn ?? null;

  return {
    today: resolveDaySchedule(
      integrationId,
      group,
      dates.today,
      liveSchedule?.today,
      updatedOn,
    ),
    tomorrow: resolveDaySchedule(
      integrationId,
      group,
      dates.tomorrow,
      liveSchedule?.tomorrow,
      updatedOn,
    ),
    updatedOn: updatedOn ?? '',
  };
}



export async function getYasnoIntegrationData(
  integrationId: string,
): Promise<YasnoIntegrationData> {
  const { regionId, dsoId } = getConfig();
  const dates = getScheduleDates();

  let group: string | null = null;
  let address: ResolvedAddress | null = null;

  try {
    address = await resolveAddress();

    group = await resolveGroup(
      regionId,
      dsoId,
      address.streetId,
      address.houseId,
    );

    const schedules = await fetchSchedule(
      regionId,
      dsoId,
    );

    const liveSchedule = schedules[group];

    if (!liveSchedule) {
      throw new Error(
        `No Yasno schedule found for group "${group}"`,
      );
    }

    const schedule = buildSchedule(
      integrationId,
      group,
      dates,
      liveSchedule,
    );

    const status = liveSchedule.today?.status ?? null;

    // Cached schedules are indicative, not confirmed.
    const times =
      status === 'ScheduleApplies' &&
        schedule.today.source === 'live' 
        ? getNextOutageTimes(liveSchedule)
        : {
          nextShutdownTime: null,
          nextRestoreTime: null,
        };

    return {
      group,
      provider: 'ДТЕК',
      status,
      ...times,
      lastSyncAt: liveSchedule.updatedOn ?? null,
      lastError: null,
      schedule,
      address: {
        street: address.street,
        house: address.house,
      },
    };
  } catch (error) {
    resolvedAddressCache = null;

    const message = error instanceof Error
      ? error.message
      : 'Unknown Yasno API error';

    group ??= getLatestScheduleGroup(
      integrationId,
      [dates.today, dates.tomorrow],
    );

    if (!group) {
      throw error;
    }

    const schedule = buildSchedule(
      integrationId,
      group,
      dates,
    );

    return {
      group,
      provider: 'ДТЕК',
      status: 'unknown',
      nextShutdownTime: null,
      nextRestoreTime: null,
      lastSyncAt: null,
      lastError: message,
      schedule,
      address: address
        ? {
          street: address.street,
          house: address.house,
        }
        : null,
    };
  }
}



/*
 * Useful for tests or manual reconfiguration.
 */
export function clearYasnoAddressCache() {
  resolvedAddressCache =
    null;
}
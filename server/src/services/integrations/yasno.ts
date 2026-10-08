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

export interface YasnoDaySchedule {
  slots: YasnoSlot[];
  date: string;
  status: YasnoStatus;
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

  schedule: YasnoGroupSchedule;

  address: {
    street: string;
    house: string;
  };
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


export async function getYasnoIntegrationData():
  Promise<YasnoIntegrationData> {
  const { regionId, dsoId } = getConfig();

  let address: ResolvedAddress;

  try {
    address =
      await resolveAddress();

    const group =
      await resolveGroup(
        regionId,
        dsoId,
        address.streetId,
        address.houseId,
      );

    const schedules =
      await fetchSchedule(
        regionId,
        dsoId,
      );

    const schedule =
      schedules[group];

    if (!schedule) {
      throw new Error(
        `No Yasno schedule found for group "${group}"`,
      );
    }

    const {
      nextShutdownTime,
      nextRestoreTime,
    } =
      getNextOutageTimes(
        schedule,
      );

    return {
      group,
      provider: "ДТЕК",
      status: schedule.today?.status ?? null,

      nextShutdownTime,
      nextRestoreTime,

      lastSyncAt: schedule.updatedOn ?? null,

      schedule,

      address: {
        street: address.street,
        house: address.house,
      },
    };
  } catch (error) {
    /*
     * An address ID may become stale if Yasno
     * changes its address registry.
     *
     * Clear cache so the next sync resolves
     * streetId / houseId again.
     */
    resolvedAddressCache =
      null;

    throw error;
  }
}


/*
 * Useful for tests or manual reconfiguration.
 */
export function clearYasnoAddressCache() {
  resolvedAddressCache =
    null;
}
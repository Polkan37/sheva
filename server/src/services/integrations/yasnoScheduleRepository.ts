
import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '../../db/client.js';
import { yasnoSchedules } from '../../db/schema.js';

import type { YasnoDaySchedule } from './yasno.js';

type SaveScheduleInput = {
  integrationId: string;
  group: string;
  day: YasnoDaySchedule;
  updatedOn: string | null;
};

export function saveSchedule({
  integrationId,
  group,
  day,
  updatedOn,
}: SaveScheduleInput): void {
  db.insert(yasnoSchedules)
    .values({
      integrationId,
      group,
      date: day.date,
      slots: day.slots,
      status: day.status,
      updatedOn,
      fetchedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        yasnoSchedules.integrationId,
        yasnoSchedules.group,
        yasnoSchedules.date,
      ],
      set: {
        slots: day.slots,
        status: day.status,
        updatedOn,
        fetchedAt: new Date(),
      },
    })
    .run();
}

export function getSavedSchedule(
  integrationId: string,
  group: string,
  date: string,
) {
  return db
    .select()
    .from(yasnoSchedules)
    .where(
      and(
        eq(yasnoSchedules.integrationId, integrationId),
        eq(yasnoSchedules.group, group),
        eq(yasnoSchedules.date, date),
      ),
    )
    .get();
}

export function getLatestScheduleGroup(
  integrationId: string,
  dates: string[],
): string | null {
  const record = db
    .select({ group: yasnoSchedules.group })
    .from(yasnoSchedules)
    .where(
      and(
        eq(yasnoSchedules.integrationId, integrationId),
        inArray(yasnoSchedules.date, dates),
      ),
    )
    .orderBy(desc(yasnoSchedules.fetchedAt))
    .limit(1)
    .get();

  return record?.group ?? null;
}


import type {
  PowerHistory,
  PowerStatus,
} from '../../../shared/api/power';

export type TimelinePeriod = {
  id: number;
  status: PowerStatus;
  start: number;
  end: number;
  durationMs: number;
};

export function getPowerTimeline(history: PowerHistory) {
  const from = new Date(history.from).getTime();
  const to = new Date(history.to).getTime();

  const periods = history.periods
    .map((period) => ({
      id: period.id,
      status: period.status,
      start: Math.max(
        from,
        new Date(period.startedAt).getTime(),
      ),
      end: Math.min(
        to,
        period.endedAt
          ? new Date(period.endedAt).getTime()
          : to,
      ),
    }))
    .filter((period) => period.end > period.start)
    .sort((a, b) => a.start - b.start);

  const timeline: TimelinePeriod[] = [];
  let cursor = from;

  for (const period of periods) {
    if (period.start > cursor) {
      timeline.push({
        id: -timeline.length - 1,
        status: 'unknown',
        start: cursor,
        end: period.start,
        durationMs: period.start - cursor,
      });
    }

    const start = Math.max(cursor, period.start);

    if (period.end <= start) continue;

    timeline.push({
      ...period,
      start,
      durationMs: period.end - start,
    });

    cursor = period.end;
  }

  if (cursor < to) {
    timeline.push({
      id: -timeline.length - 1,
      status: 'unknown',
      start: cursor,
      end: to,
      durationMs: to - cursor,
    });
  }

  return timeline;
}

export function getPowerStatistics(history: PowerHistory) {
  const timeline = getPowerTimeline(history);

  const duration = {
    online: 0,
    offline: 0,
    unknown: 0,
  };

  for (const period of timeline) {
    duration[period.status] += period.durationMs;
  }

  const knownDuration = duration.online + duration.offline;
  const totalDuration =
    new Date(history.to).getTime() -
    new Date(history.from).getTime();

  // Count only outages that actually started in this range.
  const outages = history.periods.filter(
    (period) =>
      period.status === 'offline' &&
      new Date(period.startedAt).getTime() >=
        new Date(history.from).getTime() &&
      new Date(period.startedAt).getTime() <
        new Date(history.to).getTime(),
  ).length;

  return {
    duration,
    outages,
    availability:
      knownDuration > 0
        ? (duration.online / knownDuration) * 100
        : null,
    coverage:
      totalDuration > 0
        ? (knownDuration / totalDuration) * 100
        : 0,
    timeline,
  };
}

export function formatDuration(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60_000);
  const hours = Math.floor(minutes / 60);

  if (hours === 0) return `${minutes}m`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0) {
    return `${days}d ${remainingHours}h`;
  }

  return `${hours}h ${minutes % 60}m`;
}

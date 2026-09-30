import type { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';

import {
  and,
  count,
  eq,
  gte,
  lt,
  sql,
} from 'drizzle-orm';

import { db } from '../db/client.js';
import {
  devices,
  thhomeData,
} from '../db/schema.js';

/*
 * Supported predefined periods.
 */
const RANGE_MS = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
} as const;

const DEFAULT_POINTS = 200;

/*
 * Route params
 */
const ParamsSchema = Type.Object(
  {
    uid: Type.String({
      minLength: 1,
      maxLength: 64,
    }),
  },
  {
    additionalProperties: false,
  },
);

/*
 * Query
 *
 * Valid:
 * ?range=24h
 * ?range=24h&points=300
 *
 * OR
 *
 * ?from=...&to=...
 * ?from=...&to=...&points=300
 */
const AnalyticsQuerySchema = Type.Object(
  {
    range: Type.Optional(
      Type.Union([
        Type.Literal('1h'),
        Type.Literal('6h'),
        Type.Literal('24h'),
        Type.Literal('7d'),
        Type.Literal('30d'),
      ]),
    ),

    from: Type.Optional(
      Type.String({
        format: 'date-time',
      }),
    ),

    to: Type.Optional(
      Type.String({
        format: 'date-time',
      }),
    ),

    points: Type.Optional(
      Type.Integer({
        minimum: 20,
        maximum: 500,
        default: DEFAULT_POINTS,
      }),
    ),
  },
  {
    additionalProperties: false,
  },
);

/*
 * Response schemas
 */
const NullableNumberSchema = Type.Union([
  Type.Number(),
  Type.Null(),
]);

const MetricSchema = Type.Object({
  avg: NullableNumberSchema,
  min: NullableNumberSchema,
  max: NullableNumberSchema,
});

const AnalyticsPointSchema = Type.Object({
  timestamp: Type.String(),

  samples: Type.Integer(),

  temperatureC: MetricSchema,
  humidityPct: MetricSchema,

  batteryVoltage: MetricSchema,
  batteryPct: MetricSchema,
  rssiDbm: MetricSchema,
});

const AnalyticsResponseSchema = Type.Object({
  deviceUid: Type.String(),

  period: Type.Object({
    from: Type.String(),
    to: Type.String(),
  }),

  /*
   * Approximate width of one aggregation bucket.
   */
  resolutionSec: Type.Integer(),

  /*
   * points requested by the client.
   */
  requestedPoints: Type.Integer(),

  /*
   * Actual number of returned buckets.
   */
  returnedPoints: Type.Integer(),

  /*
   * Statistics for the whole requested period.
   */
  summary: Type.Object({
    samples: Type.Integer(),

    temperatureC: MetricSchema,
    humidityPct: MetricSchema,

    batteryVoltage: MetricSchema,
    batteryPct: MetricSchema,
    rssiDbm: MetricSchema,
  }),

  /*
   * Aggregated time-series data.
   */
  data: Type.Array(
    AnalyticsPointSchema,
  ),
});

const ErrorResponseSchema = Type.Object({
  error: Type.String(),
});

/*
 * Normalizes SQLite aggregate values.
 *
 * AVG/MIN/MAX can return null when no values
 * exist in the requested period.
 */
function numberOrNull(
  value: number | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

/*
 * Converts flat SQL result into API metric structure.
 */
function metric(
  avg: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
) {
  return {
    avg: numberOrNull(avg),
    min: numberOrNull(min),
    max: numberOrNull(max),
  };
}

export const analyticsRoutes: FastifyPluginAsync = async (
  fastify,
) => {
  const app =
    fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.get(
    '/api/devices/:uid/analytics',
    {
      schema: {
        params: ParamsSchema,

        querystring:
          AnalyticsQuerySchema,

        response: {
          200: AnalyticsResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },

    async (request, reply) => {
      const { uid } = request.params;

      const {
        range,
        from,
        to,
        points = DEFAULT_POINTS,
      } = request.query;

      /*
       * 1. Validate query mode.
       *
       * Exactly one must be used:
       *
       * range
       *
       * OR
       *
       * from + to
       */
      const hasRange =
        range !== undefined;

      const hasFrom =
        from !== undefined;

      const hasTo =
        to !== undefined;

      if (
        hasRange &&
        (hasFrom || hasTo)
      ) {
        return reply
          .code(400)
          .send({
            error:
              'Use either range or from/to, not both.',
          });
      }

      if (
        !hasRange &&
        (!hasFrom || !hasTo)
      ) {
        return reply
          .code(400)
          .send({
            error:
              'Provide either range or both from and to.',
          });
      }

      /*
       * 2. Find device.
       *
       * sampleIntervalSec is needed for sensible
       * bucket resolution.
       */
      const device = db
        .select({
          id: devices.id,

          sampleIntervalSec:
            devices.sampleIntervalSec,
        })
        .from(devices)
        .where(
          eq(
            devices.uid,
            uid,
          ),
        )
        .get();

      if (!device) {
        return reply
          .code(404)
          .send({
            error:
              'DEVICE_NOT_FOUND',
          });
      }

      /*
       * 3. Resolve requested period.
       */
      let fromDate: Date;
      let toDate: Date;

      if (range) {
        toDate = new Date();

        fromDate = new Date(
          toDate.getTime() -
            RANGE_MS[range],
        );
      } else {
        /*
         * from and to are guaranteed by the
         * validation above.
         */
        fromDate = new Date(from!);
        toDate = new Date(to!);
      }

      const fromMs =
        fromDate.getTime();

      const toMs =
        toDate.getTime();

      /*
       * Additional runtime safety.
       */
      if (
        !Number.isFinite(fromMs) ||
        !Number.isFinite(toMs)
      ) {
        return reply
          .code(400)
          .send({
            error:
              'Invalid from/to date.',
          });
      }

      if (fromMs >= toMs) {
        return reply
          .code(400)
          .send({
            error:
              'from must be earlier than to.',
          });
      }

      /*
       * 4. Calculate aggregation resolution.
       *
       * Example:
       *
       * 24h / 200 points
       * ≈ 7.2 minutes per point.
       *
       * We align the bucket to the sensor's
       * sampling interval.
       *
       * If sensor sends every 60 sec:
       *
       * 7.2 min -> 8 min buckets
       *
       * Therefore response will contain
       * <= requested points.
       */
      const durationMs =
        toMs - fromMs;

      const sampleIntervalMs =
        device.sampleIntervalSec *
        1000;

      const idealBucketMs =
        Math.ceil(
          durationMs / points,
        );

      const bucketMs =
        Math.max(
          sampleIntervalMs,

          Math.ceil(
            idealBucketMs /
              sampleIntervalMs,
          ) *
            sampleIntervalMs,
        );

      /*
       * Bucket number:
       *
       * 0
       * 1
       * 2
       * ...
       *
       * relative to requested from time.
       */
      const bucketIndex = sql<number>`
        CAST(
          (
            ${thhomeData.receivedAt}
            - ${fromMs}
          )
          / ${bucketMs}
          AS INTEGER
        )
      `;

      /*
       * Common WHERE clause.
       *
       * to is exclusive:
       *
       * receivedAt >= from
       * receivedAt < to
       *
       * This avoids duplicate boundary points
       * between adjacent requests.
       */
      const periodFilter = and(
        eq(
          thhomeData.deviceId,
          device.id,
        ),

        gte(
          thhomeData.receivedAt,
          fromDate,
        ),

        lt(
          thhomeData.receivedAt,
          toDate,
        ),
      );

      /*
       * 5. Summary for the entire period.
       *
       * SQLite performs calculations;
       * raw measurements never leave DB.
       */
      const summaryResult = db
        .select({
          samples: count(),

          temperatureAvg:
            sql<number | null>`
              AVG(${thhomeData.temperatureC})
            `,

          temperatureMin:
            sql<number | null>`
              MIN(${thhomeData.temperatureC})
            `,

          temperatureMax:
            sql<number | null>`
              MAX(${thhomeData.temperatureC})
            `,

          humidityAvg:
            sql<number | null>`
              AVG(${thhomeData.humidityPct})
            `,

          humidityMin:
            sql<number | null>`
              MIN(${thhomeData.humidityPct})
            `,

          humidityMax:
            sql<number | null>`
              MAX(${thhomeData.humidityPct})
            `,

          batteryVoltageAvg:
            sql<number | null>`
              AVG(${thhomeData.batteryVoltage})
            `,

          batteryVoltageMin:
            sql<number | null>`
              MIN(${thhomeData.batteryVoltage})
            `,

          batteryVoltageMax:
            sql<number | null>`
              MAX(${thhomeData.batteryVoltage})
            `,

          batteryPctAvg:
            sql<number | null>`
              AVG(${thhomeData.batteryPct})
            `,

          batteryPctMin:
            sql<number | null>`
              MIN(${thhomeData.batteryPct})
            `,

          batteryPctMax:
            sql<number | null>`
              MAX(${thhomeData.batteryPct})
            `,

          rssiAvg:
            sql<number | null>`
              AVG(${thhomeData.rssiDbm})
            `,

          rssiMin:
            sql<number | null>`
              MIN(${thhomeData.rssiDbm})
            `,

          rssiMax:
            sql<number | null>`
              MAX(${thhomeData.rssiDbm})
            `,
        })
        .from(thhomeData)
        .where(periodFilter)
        .get();

      /*
       * 6. Aggregated time-series.
       *
       * Instead of:
       *
       * 10,080 measurements -> Node -> browser
       *
       * SQLite returns approximately:
       *
       * 200 aggregated rows -> Node -> browser
       */
      const result = db
        .select({
          bucket:
            bucketIndex,

          /*
           * Average real timestamp of samples
           * inside this bucket.
           *
           * This preserves visible gaps when
           * the sensor was offline.
           */
          timestampMs:
            sql<number>`
              AVG(${thhomeData.receivedAt})
            `,

          samples:
            count(),

          temperatureAvg:
            sql<number | null>`
              AVG(${thhomeData.temperatureC})
            `,

          temperatureMin:
            sql<number | null>`
              MIN(${thhomeData.temperatureC})
            `,

          temperatureMax:
            sql<number | null>`
              MAX(${thhomeData.temperatureC})
            `,

          humidityAvg:
            sql<number | null>`
              AVG(${thhomeData.humidityPct})
            `,

          humidityMin:
            sql<number | null>`
              MIN(${thhomeData.humidityPct})
            `,

          humidityMax:
            sql<number | null>`
              MAX(${thhomeData.humidityPct})
            `,

          batteryVoltageAvg:
            sql<number | null>`
              AVG(${thhomeData.batteryVoltage})
            `,

          batteryVoltageMin:
            sql<number | null>`
              MIN(${thhomeData.batteryVoltage})
            `,

          batteryVoltageMax:
            sql<number | null>`
              MAX(${thhomeData.batteryVoltage})
            `,

          batteryPctAvg:
            sql<number | null>`
              AVG(${thhomeData.batteryPct})
            `,

          batteryPctMin:
            sql<number | null>`
              MIN(${thhomeData.batteryPct})
            `,

          batteryPctMax:
            sql<number | null>`
              MAX(${thhomeData.batteryPct})
            `,

          rssiAvg:
            sql<number | null>`
              AVG(${thhomeData.rssiDbm})
            `,

          rssiMin:
            sql<number | null>`
              MIN(${thhomeData.rssiDbm})
            `,

          rssiMax:
            sql<number | null>`
              MAX(${thhomeData.rssiDbm})
            `,
        })
        .from(thhomeData)
        .where(periodFilter)
        .groupBy(bucketIndex)
        .orderBy(bucketIndex)
        .all();

      /*
       * 7. Build API response.
       */
      const summary = {
        samples:
          summaryResult?.samples ??
          0,

        temperatureC: metric(
          summaryResult?.temperatureAvg,
          summaryResult?.temperatureMin,
          summaryResult?.temperatureMax,
        ),

        humidityPct: metric(
          summaryResult?.humidityAvg,
          summaryResult?.humidityMin,
          summaryResult?.humidityMax,
        ),

        batteryVoltage: metric(
          summaryResult?.batteryVoltageAvg,
          summaryResult?.batteryVoltageMin,
          summaryResult?.batteryVoltageMax,
        ),

        batteryPct: metric(
          summaryResult?.batteryPctAvg,
          summaryResult?.batteryPctMin,
          summaryResult?.batteryPctMax,
        ),

        rssiDbm: metric(
          summaryResult?.rssiAvg,
          summaryResult?.rssiMin,
          summaryResult?.rssiMax,
        ),
      };

      const data = result.map(
        (row) => ({
          timestamp:
            new Date(
              Number(
                row.timestampMs,
              ),
            ).toISOString(),

          samples:
            row.samples,

          temperatureC:
            metric(
              row.temperatureAvg,
              row.temperatureMin,
              row.temperatureMax,
            ),

          humidityPct:
            metric(
              row.humidityAvg,
              row.humidityMin,
              row.humidityMax,
            ),

          batteryVoltage:
            metric(
              row.batteryVoltageAvg,
              row.batteryVoltageMin,
              row.batteryVoltageMax,
            ),

          batteryPct:
            metric(
              row.batteryPctAvg,
              row.batteryPctMin,
              row.batteryPctMax,
            ),

          rssiDbm:
            metric(
              row.rssiAvg,
              row.rssiMin,
              row.rssiMax,
            ),
        }),
      );

      return {
        deviceUid: uid,

        period: {
          from:
            fromDate.toISOString(),

          to:
            toDate.toISOString(),
        },

        resolutionSec:
          Math.ceil(
            bucketMs / 1000,
          ),

        requestedPoints:
          points,

        returnedPoints:
          data.length,

        summary,

        data,
      };
    },
  );
};
import type { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import {
  count,
  desc,
  eq,
} from 'drizzle-orm';

import { db } from '../db/client.js';
import { devices, thhomeData } from '../db/schema.js';

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

const MeasurementSchema = Type.Object(
  {
    schemaVersion: Type.Literal(1),

    messageId: Type.String({
      minLength: 1,
      maxLength: 64,
    }),

    sequence: Type.Optional(
      Type.Integer({
        minimum: 0,
      }),
    ),

    capturedAt: Type.Optional(
      Type.String({
        format: 'date-time',
      }),
    ),

    temperatureC: Type.Number({
      minimum: -50,
      maximum: 100,
    }),

    humidityPct: Type.Number({
      minimum: 0,
      maximum: 100,
    }),

    batteryVoltage: Type.Optional(
      Type.Number({
        minimum: 0,
        maximum: 6,
      }),
    ),

    batteryPct: Type.Optional(
      Type.Number({
        minimum: 0,
        maximum: 100,
      }),
    ),

    rssiDbm: Type.Optional(
      Type.Integer({
        minimum: -120,
        maximum: 0,
      }),
    ),

    firmwareVersion: Type.Optional(
      Type.String({
        maxLength: 32,
      }),
    ),
  },
  {
    additionalProperties: false,
  },
);

const CreatedResponseSchema = Type.Object({
  accepted: Type.Boolean(),
  duplicate: Type.Boolean(),
  readingId: Type.Integer(),
});

const DuplicateResponseSchema = Type.Object({
  accepted: Type.Boolean(),
  duplicate: Type.Boolean(),
});

const NotFoundResponseSchema = Type.Object({
  error: Type.String(),
});

const MeasurementsQuerySchema = Type.Object(
  {
    amount: Type.Union([
      Type.Literal('latest'),

      Type.Integer({
        minimum: 1,
        maximum: 1000,
      }),
    ]),

    startNumber: Type.Optional(
      Type.Integer({
        minimum: 1,
      }),
    ),
  },
  {
    additionalProperties: false,
  },
);

const MeasurementResponseSchema = Type.Object({
  id: Type.Integer(),

  sequence: Type.Union([
    Type.Integer(),
    Type.Null(),
  ]),

  capturedAt: Type.Union([
    Type.String(),
    Type.Null(),
  ]),

  receivedAt: Type.String(),

  temperatureC: Type.Number(),
  humidityPct: Type.Number(),

  batteryVoltage: Type.Union([
    Type.Number(),
    Type.Null(),
  ]),

  batteryPct: Type.Union([
    Type.Number(),
    Type.Null(),
  ]),

  rssiDbm: Type.Union([
    Type.Integer(),
    Type.Null(),
  ]),

  firmwareVersion: Type.Union([
    Type.String(),
    Type.Null(),
  ]),
});

const MeasurementsResponseSchema = Type.Object({
  totalRecords: Type.Integer(),

  startNumber: Type.Integer(),

  returnedRecords: Type.Integer(),

  nextStartNumber: Type.Union([
    Type.Integer(),
    Type.Null(),
  ]),

  measurements: Type.Array(
    MeasurementResponseSchema,
  ),
});

export const measurementRoutes: FastifyPluginAsync = async (
  fastify,
) => {
    
  const app =
    fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.post(
    '/api/devices/:uid/measurements',
    {
      schema: {
        params: ParamsSchema,
        body: MeasurementSchema,

        response: {
          201: CreatedResponseSchema,
          200: DuplicateResponseSchema,
          404: NotFoundResponseSchema,
        },
      },
    },

    async (request, reply) => {
      const { uid } = request.params;
      const measurement = request.body;

      /*
       * 1. Find device
       */
      const device = db
        .select({
          id: devices.id,
        })
        .from(devices)
        .where(eq(devices.uid, uid))
        .get();

      if (!device) {
        return reply
          .code(404)
          .send({
            error: 'DEVICE_NOT_FOUND',
          });
      }

      const receivedAt = new Date();

      /*
       * 2. Insert data + update lastSeenAt atomically
       */
      const inserted = db.transaction((tx) => {
        const reading = tx
          .insert(thhomeData)
          .values({
            deviceId: device.id,

            schemaVersion:
              measurement.schemaVersion,

            messageId:
              measurement.messageId,

            sequence:
              measurement.sequence ?? null,

            capturedAt:
              measurement.capturedAt
                ? new Date(
                    measurement.capturedAt,
                  )
                : null,

            receivedAt,

            temperatureC:
              measurement.temperatureC,

            humidityPct:
              measurement.humidityPct,

            batteryVoltage:
              measurement.batteryVoltage ??
              null,

            batteryPct:
              measurement.batteryPct ?? null,

            rssiDbm:
              measurement.rssiDbm ?? null,

            firmwareVersion:
              measurement.firmwareVersion ??
              null,
          })
          .onConflictDoNothing({
            target: [
              thhomeData.deviceId,
              thhomeData.messageId,
            ],
          })
          .returning({
            id: thhomeData.id,
          })
          .get();

        const deviceUpdate: Partial<
          typeof devices.$inferInsert
        > = {
          lastSeenAt: receivedAt,
          updatedAt: receivedAt,
        };

        if (
          measurement.firmwareVersion !==
          undefined
        ) {
          deviceUpdate.firmwareVersion =
            measurement.firmwareVersion;
        }

        tx
          .update(devices)
          .set(deviceUpdate)
          .where(
            eq(
              devices.id,
              device.id,
            ),
          )
          .run();

        return reading;
      });

      if (!inserted) {
        return reply
          .code(200)
          .send({
            accepted: true,
            duplicate: true,
          });
      }

      return reply
        .code(201)
        .send({
          accepted: true,
          duplicate: false,
          readingId: inserted.id,
        });
    },
  );
  app.get(
  '/api/devices/:uid/measurements',
  {
    schema: {
      params: ParamsSchema,
      querystring: MeasurementsQuerySchema,

      response: {
        200: MeasurementsResponseSchema,
        404: NotFoundResponseSchema,
      },
    },
  },

  async (request, reply) => {
    const { uid } = request.params;

    const {
      amount,
      startNumber = 1,
    } = request.query;

    /*
     * Find device first.
     */
    const device = db
      .select({
        id: devices.id,
      })
      .from(devices)
      .where(eq(devices.uid, uid))
      .get();

    if (!device) {
      return reply
        .code(404)
        .send({
          error: 'DEVICE_NOT_FOUND',
        });
    }

    /*
     * amount=latest is equivalent to requesting one latest measurement.
     */
    const limit =
      amount === 'latest'
        ? 1
        : amount;

    /*
     * startNumber is 1-based for the API, while SQL OFFSET is 0-based.
     *
     * startNumber=1    -> OFFSET 0
     * startNumber=1001 -> OFFSET 1000
     */
    const offset = startNumber - 1;

    /*
     * Count all measurements belonging to this device.
     */
    const totalResult = db
      .select({
        value: count(),
      })
      .from(thhomeData)
      .where(
        eq(
          thhomeData.deviceId,
          device.id,
        ),
      )
      .get();

    const totalRecords =
      totalResult?.value ?? 0;

    /*
     * Fetch requested portion.
     *
     * receivedAt DESC gives newest first.
     *
     * id DESC is a tie-breaker in case two
     * measurements have identical receivedAt.
     */
    const result = db
      .select({
        id: thhomeData.id,

        sequence: thhomeData.sequence,

        capturedAt:
          thhomeData.capturedAt,

        receivedAt:
          thhomeData.receivedAt,

        temperatureC:
          thhomeData.temperatureC,

        humidityPct:
          thhomeData.humidityPct,

        batteryVoltage:
          thhomeData.batteryVoltage,

        batteryPct:
          thhomeData.batteryPct,

        rssiDbm:
          thhomeData.rssiDbm,

        firmwareVersion:
          thhomeData.firmwareVersion,
      })
      .from(thhomeData)
      .where(
        eq(
          thhomeData.deviceId,
          device.id,
        ),
      )
      .orderBy(
        desc(thhomeData.receivedAt),
        desc(thhomeData.id),
      )
      .limit(limit)
      .offset(offset)
      .all();

    const returnedRecords =
      result.length;

    const nextStartNumber =
      offset + returnedRecords <
      totalRecords
        ? startNumber +
          returnedRecords
        : null;

    return {
      totalRecords,

      startNumber,

      returnedRecords,

      nextStartNumber,

      measurements: result.map(
        (measurement) => ({
          id: measurement.id,

          sequence:
            measurement.sequence,

          capturedAt:
            measurement.capturedAt
              ?.toISOString() ??
            null,

          receivedAt:
            measurement.receivedAt
              .toISOString(),

          temperatureC:
            measurement.temperatureC,

          humidityPct:
            measurement.humidityPct,

          batteryVoltage:
            measurement.batteryVoltage,

          batteryPct:
            measurement.batteryPct,

          rssiDbm:
            measurement.rssiDbm,

          firmwareVersion:
            measurement.firmwareVersion,
        }),
      ),
    };
  },
);
};
import type { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import {
  asc,
  desc,
  eq,
} from 'drizzle-orm';

import { db } from '../db/client.js';
import {
  rooms,
  thhomeData,
} from '../db/schema.js';

const RoomSchema = Type.Object({
  id: Type.String(),

  name: Type.String(),

  slug: Type.String(),

  displayOrder: Type.Integer(),

  temperature: Type.Union([
    Type.Number(),
    Type.Null(),
  ]),

  humidity: Type.Union([
    Type.Number(),
    Type.Null(),
  ]),
});

const RoomsResponseSchema = Type.Object({
  rooms: Type.Array(RoomSchema),
});

export const roomRoutes: FastifyPluginAsync = async (
  fastify,
) => {
  const app =
    fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.get(
    '/api/rooms',
    {
      schema: {
        response: {
          200: RoomsResponseSchema,
        },
      },
    },

    async () => {
      const roomList = db
        .select({
          id: rooms.id,
          name: rooms.name,
          slug: rooms.slug,

          displayOrder:
            rooms.displayOrder,

          temperatureDeviceId:
            rooms.temperatureDeviceId,

          humidityDeviceId:
            rooms.humidityDeviceId,
        })
        .from(rooms)
        .orderBy(
          asc(rooms.displayOrder),
          asc(rooms.name),
        )
        .all();

      return {
        rooms: roomList.map((room) => {
          const temperatureMeasurement =
            room.temperatureDeviceId
              ? db
                  .select({
                    temperature:
                      thhomeData.temperatureC,
                  })
                  .from(thhomeData)
                  .where(
                    eq(
                      thhomeData.deviceId,
                      room.temperatureDeviceId,
                    ),
                  )
                  .orderBy(
                    desc(thhomeData.receivedAt),
                    desc(thhomeData.id),
                  )
                  .limit(1)
                  .get()
              : null;

          const humidityMeasurement =
            room.humidityDeviceId
              ? db
                  .select({
                    humidity:
                      thhomeData.humidityPct,
                  })
                  .from(thhomeData)
                  .where(
                    eq(
                      thhomeData.deviceId,
                      room.humidityDeviceId,
                    ),
                  )
                  .orderBy(
                    desc(thhomeData.receivedAt),
                    desc(thhomeData.id),
                  )
                  .limit(1)
                  .get()
              : null;

          return {
            id: room.id,
            name: room.name,
            slug: room.slug,

            displayOrder:
              room.displayOrder,

            temperature:
              temperatureMeasurement
                ?.temperature ?? null,

            humidity:
              humidityMeasurement
                ?.humidity ?? null,
          };
        }),
      };
    },
  );
};
import type { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import { eq } from 'drizzle-orm';

import { db } from '../db/client.js';
import { devices, rooms } from '../db/schema.js';

const DeviceSchema = Type.Object({
  id: Type.String(),
  uid: Type.String(),
  name: Type.String(),
  description: Type.Union([
    Type.String(),
    Type.Null(),
  ]),
  type: Type.String(),

  room: Type.Union([
    Type.Object({
      id: Type.String(),
      name: Type.String(),
    }),
    Type.Null(),
  ]),

  sampleIntervalSec: Type.Integer(),

  firmwareVersion: Type.Union([
    Type.String(),
    Type.Null(),
  ]),

  lastSeenAt: Type.Union([
    Type.String(),
    Type.Null(),
  ]),

  online: Type.Boolean(),
});

const DevicesResponseSchema = Type.Object({
  devices: Type.Array(DeviceSchema),
});

export const deviceRoutes: FastifyPluginAsync = async (
  fastify,
) => {
  const app =
    fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.get(
    '/api/devices/',
    {
      schema: {
        response: {
          200: DevicesResponseSchema,
        },
      },
    },

    async () => {
      const result = db
        .select({
          id: devices.id,
          uid: devices.uid,
          name: devices.name,
          description: devices.description,
          type: devices.type,

          roomId: rooms.id,
          roomName: rooms.name,

          sampleIntervalSec:
            devices.sampleIntervalSec,

          firmwareVersion:
            devices.firmwareVersion,

          lastSeenAt:
            devices.lastSeenAt,
        })
        .from(devices)
        .leftJoin(
          rooms,
          eq(devices.roomId, rooms.id),
        )
        .all();

      return {
        devices: result.map((device) => {
          const online =
            device.lastSeenAt !== null &&
            Date.now() -
            device.lastSeenAt.getTime() <
            device.sampleIntervalSec *
            3 *
            1000;

          return {
            id: device.id,
            uid: device.uid,
            name: device.name,
            description: device.description,
            type: device.type,

            room:
              device.roomId &&
                device.roomName
                ? {
                  id: device.roomId,
                  name: device.roomName,
                }
                : null,

            sampleIntervalSec:
              device.sampleIntervalSec,

            firmwareVersion:
              device.firmwareVersion,

            lastSeenAt:
              device.lastSeenAt?.toISOString() ??
              null,

            online,
          };
        }),
      };
    },
  );
};
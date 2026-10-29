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

  macAddress: Type.Union([
    Type.String(),
    Type.Null(),
  ]),
  ipAddress: Type.Union([
    Type.String(),
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


const NullableString = Type.Union([
  Type.String(),
  Type.Null(),
]);

const DeviceFieldsSchema = Type.Object({
  uid: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  type: Type.String({ minLength: 1 }),

  description: NullableString,
  macAddress: NullableString,
  ipAddress: NullableString,
  roomId: NullableString,

  sampleIntervalSec: Type.Integer({ minimum: 1 }),
  firmwareVersion: NullableString,
});

const CreateDeviceSchema = Type.Object({
  uid: DeviceFieldsSchema.properties.uid,
  name: DeviceFieldsSchema.properties.name,
  type: DeviceFieldsSchema.properties.type,

  description: Type.Optional(NullableString),
  macAddress: Type.Optional(NullableString),
  ipAddress: Type.Optional(NullableString),
  roomId: Type.Optional(NullableString),

  sampleIntervalSec: Type.Optional(
    DeviceFieldsSchema.properties.sampleIntervalSec,
  ),

  firmwareVersion: Type.Optional(NullableString),
});

const UpdateDeviceSchema = Type.Partial(
  DeviceFieldsSchema,
  { minProperties: 1 },
);

const DeviceParamsSchema = Type.Object({
  id: Type.String(),
});


export const deviceRoutes: FastifyPluginAsync = async (
  fastify,
) => {
  const app =
    fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.get(
    '/api/devices',
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

          macAddress: devices.macAddress,
          ipAddress: devices.ipAddress,

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

            macAddress: device.macAddress,
            ipAddress: device.ipAddress,

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

  app.post(
    '/api/devices',
    {
      schema: {
        body: CreateDeviceSchema,
      },
    },
    async (request, reply) => {
      const {
        uid,
        name,
        type,
        description = null,
        macAddress = null,
        ipAddress = null,
        roomId = null,
        sampleIntervalSec = 60,
        firmwareVersion = null,
      } = request.body;

      const existingDevice = db
        .select({ id: devices.id })
        .from(devices)
        .where(eq(devices.uid, uid))
        .get();

      if (existingDevice) {
        return reply.code(409).send({
          message: 'Device UID already exists',
        });
      }

      if (macAddress !== null) {
        const existingMac = db
          .select({ id: devices.id })
          .from(devices)
          .where(eq(devices.macAddress, macAddress))
          .get();

        if (existingMac) {
          return reply.code(409).send({
            message: 'MAC address already exists',
          });
        }
      }

      if (roomId !== null) {
        const room = db
          .select({ id: rooms.id })
          .from(rooms)
          .where(eq(rooms.id, roomId))
          .get();

        if (!room) {
          return reply.code(400).send({
            message: 'Room not found',
          });
        }
      }

      const now = new Date();

      const device = db
        .insert(devices)
        .values({
          id: crypto.randomUUID(),
          uid,
          name,
          type,
          description,
          macAddress,
          ipAddress,
          roomId,
          sampleIntervalSec,
          firmwareVersion,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();

      return reply.code(201).send(device);
    },
  );

  app.patch(
    '/api/devices/:id',
    {
      schema: {
        params: DeviceParamsSchema,
        body: UpdateDeviceSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body;

      const existingDevice = db
        .select()
        .from(devices)
        .where(eq(devices.id, id))
        .get();

      if (!existingDevice) {
        return reply.code(404).send({
          message: 'Device not found',
        });
      }

      if (updates.uid !== undefined) {
        const duplicate = db
          .select({ id: devices.id })
          .from(devices)
          .where(eq(devices.uid, updates.uid))
          .get();

        if (duplicate && duplicate.id !== id) {
          return reply.code(409).send({
            message: 'Device UID already exists',
          });
        }
      }

      if (
        updates.macAddress !== undefined &&
        updates.macAddress !== null
      ) {
        const duplicate = db
          .select({ id: devices.id })
          .from(devices)
          .where(eq(devices.macAddress, updates.macAddress))
          .get();

        if (duplicate && duplicate.id !== id) {
          return reply.code(409).send({
            message: 'MAC address already exists',
          });
        }
      }

      if (
        updates.roomId !== undefined &&
        updates.roomId !== null
      ) {
        const room = db
          .select({ id: rooms.id })
          .from(rooms)
          .where(eq(rooms.id, updates.roomId))
          .get();

        if (!room) {
          return reply.code(400).send({
            message: 'Room not found',
          });
        }
      }

      const updatedDevice = db
        .update(devices)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(devices.id, id))
        .returning()
        .get();

      return reply.code(200).send(updatedDevice);
    },
  );

  app.delete(
    '/api/devices/:id',
    {
      schema: {
        params: DeviceParamsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const deletedDevice = db
        .delete(devices)
        .where(eq(devices.id, id))
        .returning({ id: devices.id })
        .get();

      if (!deletedDevice) {
        return reply.code(404).send({
          message: 'Device not found',
        });
      }

      return reply.code(204).send();
    },
  );

};
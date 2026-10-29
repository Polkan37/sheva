import type { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import { asc, desc, eq, or } from 'drizzle-orm';

import { db } from '../db/client.js';
import { rooms, devices, thhomeData, } from '../db/schema.js';

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

const RoomFieldsSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  slug: Type.String({ minLength: 1 }),
  displayOrder: Type.Integer(),
  temperatureDeviceId: Type.Union([
    Type.String(),
    Type.Null(),
  ]),
  humidityDeviceId: Type.Union([
    Type.String(),
    Type.Null(),
  ]),
});

const CreateRoomSchema = Type.Object({
  name: RoomFieldsSchema.properties.name,
  slug: RoomFieldsSchema.properties.slug,
  displayOrder: Type.Optional(
    RoomFieldsSchema.properties.displayOrder,
  ),
  temperatureDeviceId: Type.Optional(
    RoomFieldsSchema.properties.temperatureDeviceId,
  ),
  humidityDeviceId: Type.Optional(
    RoomFieldsSchema.properties.humidityDeviceId,
  ),
});

const UpdateRoomSchema = Type.Partial(
  RoomFieldsSchema,
  { minProperties: 1 },
);

const RoomParamsSchema = Type.Object({
  id: Type.String(),
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


  app.post(
    '/api/rooms',
    {
      schema: {
        body: CreateRoomSchema,
      },
    },
    async (request, reply) => {
      const {
        name,
        slug,
        displayOrder = 0,
        temperatureDeviceId = null,
        humidityDeviceId = null,
      } = request.body;

      const existingRoom = db
        .select({ id: rooms.id })
        .from(rooms)
        .where(
          or(
            eq(rooms.name, name),
            eq(rooms.slug, slug),
          ),
        )
        .get();

      if (existingRoom) {
        return reply.code(409).send({
          message: 'Room name or slug already exists',
        });
      }

      const deviceIds = [
        temperatureDeviceId,
        humidityDeviceId,
      ].filter((id): id is string => id !== null);

      for (const deviceId of deviceIds) {
        const device = db
          .select({ id: devices.id })
          .from(devices)
          .where(eq(devices.id, deviceId))
          .get();

        if (!device) {
          return reply.code(400).send({
            message: `Device ${deviceId} not found`,
          });
        }
      }

      const now = new Date();

      const room = db
        .insert(rooms)
        .values({
          id: crypto.randomUUID(),
          name,
          slug,
          displayOrder,
          temperatureDeviceId,
          humidityDeviceId,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();

      return reply.code(201).send(room);
    },
  );


  app.patch(
    '/api/rooms/:id',
    {
      schema: {
        params: RoomParamsSchema,
        body: UpdateRoomSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body;

      const existingRoom = db
        .select()
        .from(rooms)
        .where(eq(rooms.id, id))
        .get();

      if (!existingRoom) {
        return reply.code(404).send({
          message: 'Room not found',
        });
      }

      if (updates.name !== undefined) {
        const duplicate = db
          .select({ id: rooms.id })
          .from(rooms)
          .where(eq(rooms.name, updates.name))
          .get();

        if (duplicate && duplicate.id !== id) {
          return reply.code(409).send({
            message: 'Room name already exists',
          });
        }
      }

      if (updates.slug !== undefined) {
        const duplicate = db
          .select({ id: rooms.id })
          .from(rooms)
          .where(eq(rooms.slug, updates.slug))
          .get();

        if (duplicate && duplicate.id !== id) {
          return reply.code(409).send({
            message: 'Room slug already exists',
          });
        }
      }

      const deviceIds = [
        updates.temperatureDeviceId,
        updates.humidityDeviceId,
      ].filter(
        (id): id is string =>
          id !== undefined && id !== null,
      );

      for (const deviceId of deviceIds) {
        const device = db
          .select({ id: devices.id })
          .from(devices)
          .where(eq(devices.id, deviceId))
          .get();

        if (!device) {
          return reply.code(400).send({
            message: `Device ${deviceId} not found`,
          });
        }
      }

      const updatedRoom = db
        .update(rooms)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(rooms.id, id))
        .returning()
        .get();

      return reply.code(200).send(updatedRoom);
    },
  );

  app.delete(
    '/api/rooms/:id',
    {
      schema: {
        params: RoomParamsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const deletedRoom = db
        .delete(rooms)
        .where(eq(rooms.id, id))
        .returning({ id: rooms.id })
        .get();

      if (!deletedRoom) {
        return reply.code(404).send({
          message: 'Room not found',
        });
      }

      return reply.code(204).send();
    },
  );

};
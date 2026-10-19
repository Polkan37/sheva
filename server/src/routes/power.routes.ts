
import type { FastifyPluginAsync } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import {
  and,
  asc,
  eq,
  gt,
  isNull,
  lt,
  or,
} from 'drizzle-orm';

import { db } from '../db/client.js';
import { devices, powerOutages } from '../db/schema.js';

const Params = Type.Object({
  uid: Type.String({ minLength: 1 }),
});

const Query = Type.Object({
  range: Type.Optional(
    Type.Union([
      Type.Literal('24h'),
      Type.Literal('7d'),
      Type.Literal('30d'),
    ]),
  ),
});

const Status = Type.Union([
  Type.Literal('online'),
  Type.Literal('offline'),
  Type.Literal('unknown'),
]);

const ErrorResponse = Type.Object({
  error: Type.String(),
});

const StatusResponse = Type.Object({
  deviceUid: Type.String(),
  status: Status,
  since: Type.Union([Type.String(), Type.Null()]),
  lastCheckedAt: Type.Union([
    Type.String(),
    Type.Null(),
  ]),
});

const HistoryResponse = Type.Object({
  deviceUid: Type.String(),
  from: Type.String(),
  to: Type.String(),
  periods: Type.Array(
    Type.Object({
      id: Type.Integer(),
      status: Status,
      startedAt: Type.String(),
      endedAt: Type.Union([
        Type.String(),
        Type.Null(),
      ]),
    }),
  ),
});

function getPlug(uid: string) {
  return db
    .select({ id: devices.id })
    .from(devices)
    .where(
      and(
        eq(devices.uid, uid),
        eq(devices.type, 'smart_plug'),
      ),
    )
    .get();
}

export const powerRoutes: FastifyPluginAsync = async (
  fastify,
) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.get(
    '/api/devices/:uid/power',
    {
      schema: {
        params: Params,
        response: {
          200: StatusResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { uid } = request.params;
      const device = getPlug(uid);

      if (!device) {
        return reply.code(404).send({
          error: 'DEVICE_NOT_FOUND',
        });
      }

      const active = db
        .select()
        .from(powerOutages)
        .where(
          and(
            eq(powerOutages.deviceId, device.id),
            isNull(powerOutages.endedAt),
          ),
        )
        .get();

      return {
        deviceUid: uid,
        status: active?.status ?? 'unknown',
        since: active?.startedAt.toISOString() ?? null,
        lastCheckedAt:
          active?.lastCheckedAt?.toISOString() ?? null,
      };
    },
  );

  app.get(
    '/api/devices/:uid/power/history',
    {
      schema: {
        params: Params,
        querystring: Query,
        response: {
          200: HistoryResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { uid } = request.params;
      const device = getPlug(uid);

      if (!device) {
        return reply.code(404).send({
          error: 'DEVICE_NOT_FOUND',
        });
      }

      const durations = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };

      const range = request.query.range ?? '24h';
      const to = new Date();
      const from = new Date(
        to.getTime() - durations[range],
      );

      const result = db
        .select()
        .from(powerOutages)
        .where(
          and(
            eq(powerOutages.deviceId, device.id),
            lt(powerOutages.startedAt, to),
            or(
              isNull(powerOutages.endedAt),
              gt(powerOutages.endedAt, from),
            ),
          ),
        )
        .orderBy(asc(powerOutages.startedAt))
        .all();

      return {
        deviceUid: uid,
        from: from.toISOString(),
        to: to.toISOString(),
        periods: result.map((period) => ({
          id: period.id,
          status: period.status,
          startedAt: period.startedAt.toISOString(),
          endedAt:
            period.endedAt?.toISOString() ?? null,
        })),
      };
    },
  );
};

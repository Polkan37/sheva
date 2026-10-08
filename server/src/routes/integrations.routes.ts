import type { FastifyInstance } from "fastify";

import { db } from '../db/client.js';
import { integrations } from "../db/schema.js";

import { getIntegrations } from "../services/integrations/index.js";

export async function integrationsRoutes(
  app: FastifyInstance,
) {
  app.get("/api/integrations", async () => {
    const rows = await db
      .select()
      .from(integrations);

    const result = await Promise.all(
      rows.map(async (integration) => {
        const specificData =
          await getIntegrations(
            integration.type,
            integration.id,
          );

        return {
          id: integration.id,
          uid: integration.uid,
          name: integration.name,
          description: integration.description,
          type: integration.type,
          enabled: integration.enabled,

          lastSyncAt: integration.lastSyncAt,
          lastError: integration.lastError,
          
          ...specificData,
        };
      }),
    );

    return {
      integrations: result,
    };
  });
}
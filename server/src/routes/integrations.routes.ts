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
            if (!integration.enabled) return null;

            try {
                const specificData = await getIntegrations(
                    integration.type,
                    integration.id,
                );

                return {
                    ...integration,
                    ...specificData,
                };
            } catch (error) {
                app.log.error(
                    { err: error, integration: integration.uid },
                    "Integration failed",
                );

                return null;
            }
        }),
    );

    return {
        integrations: result.filter(
            (integration) => integration !== null,
        ),
    };
});
}
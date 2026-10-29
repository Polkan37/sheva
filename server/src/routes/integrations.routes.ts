import type { FastifyInstance } from "fastify";

import { db } from '../db/client.js';
import { integrations } from "../db/schema.js";

import { Type } from 'typebox';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { getIntegrations } from "../services/integrations/index.js";

const NullableString = Type.Union([
    Type.String(),
    Type.Null(),
]);

const IntegrationFieldsSchema = Type.Object({
    uid: Type.String({ minLength: 1 }),
    name: Type.String({ minLength: 1 }),
    type: Type.String({ minLength: 1 }),
    description: NullableString,
    enabled: Type.Boolean(),
    status: Type.String({ minLength: 1 }),
    lastError: NullableString,
});

const CreateIntegrationSchema = Type.Object({
    uid: IntegrationFieldsSchema.properties.uid,
    name: IntegrationFieldsSchema.properties.name,
    type: IntegrationFieldsSchema.properties.type,

    description: Type.Optional(NullableString),
    enabled: Type.Optional(Type.Boolean()),
    status: Type.Optional(
        IntegrationFieldsSchema.properties.status,
    ),
    lastError: Type.Optional(NullableString),
}, { additionalProperties: false });

const UpdateIntegrationSchema = Type.Partial(
    IntegrationFieldsSchema,
    {
        minProperties: 1,
        additionalProperties: false,
    },
);

const IntegrationParamsSchema = Type.Object({
    id: Type.String(),
});

export async function integrationsRoutes(app: FastifyInstance) {
    const api = app.withTypeProvider<TypeBoxTypeProvider>();

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

    api.post(
        '/api/integrations',
        {
            schema: {
                body: CreateIntegrationSchema,
            },
        },
        async (request, reply) => {
            const {
                uid,
                name,
                type,
                description = null,
                enabled = false,
                status = 'unknown',
                lastError = null,
            } = request.body;

            const existingIntegration = db
                .select({ id: integrations.id })
                .from(integrations)
                .where(eq(integrations.uid, uid))
                .get();

            if (existingIntegration) {
                return reply.code(409).send({
                    message: 'Integration UID already exists',
                });
            }

            const now = new Date().toISOString();

            const integration = db
                .insert(integrations)
                .values({
                    id: randomUUID(),
                    uid,
                    name,
                    type,
                    description,
                    enabled,
                    status,
                    lastError,
                    createdAt: now,
                    updatedAt: now,
                })
                .returning()
                .get();

            return reply.code(201).send(integration);
        },
    );


    api.patch(
        '/api/integrations/:id',
        {
            schema: {
                params: IntegrationParamsSchema,
                body: UpdateIntegrationSchema,
            },
        },
        async (request, reply) => {
            const { id } = request.params;
            const updates = request.body;

            const existingIntegration = db
                .select()
                .from(integrations)
                .where(eq(integrations.id, id))
                .get();

            if (!existingIntegration) {
                return reply.code(404).send({
                    message: 'Integration not found',
                });
            }

            if (updates.uid !== undefined) {
                const duplicate = db
                    .select({ id: integrations.id })
                    .from(integrations)
                    .where(eq(integrations.uid, updates.uid))
                    .get();

                if (duplicate && duplicate.id !== id) {
                    return reply.code(409).send({
                        message: 'Integration UID already exists',
                    });
                }
            }

            const updatedIntegration = db
                .update(integrations)
                .set({
                    ...updates,
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(integrations.id, id))
                .returning()
                .get();

            return reply.code(200).send(updatedIntegration);
        },
    );


    api.delete(
        '/api/integrations/:id',
        {
            schema: {
                params: IntegrationParamsSchema,
            },
        },
        async (request, reply) => {
            const { id } = request.params;

            const deletedIntegration = db
                .delete(integrations)
                .where(eq(integrations.id, id))
                .returning({ id: integrations.id })
                .get();

            if (!deletedIntegration) {
                return reply.code(404).send({
                    message: 'Integration not found',
                });
            }

            return reply.code(204).send();
        },
    );

    api.get('/api/integrations/settings', async () => {
        const result = db
            .select()
            .from(integrations)
            .all();

        return {
            integrations: result,
        };
    });
}
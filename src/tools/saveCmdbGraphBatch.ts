import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

const serviceCreateInputSchema = z.object({
  name: z.string().min(1).describe('Service name'),
  serviceType: z
    .enum(['internal', 'external', 'cloud'])
    .optional()
    .describe('Type of service (default: internal)'),
  protectionLevel: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe('Protection level 1 (highest criticality) to 5 (lowest); defaults to 3 if omitted'),
  description: z.string().optional().describe('Free-text description of the service'),
  tags: z.array(z.string()).optional().describe('Categorization tags'),
});

const serviceUpdateInputSchema = z.object({
  name: z.string().min(1).optional().describe('Updated service name'),
  serviceType: z
    .enum(['internal', 'external', 'cloud'])
    .nullable()
    .optional()
    .describe('Updated service type (null to clear)'),
  protectionLevel: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe('Updated protection level (1=highest, 5=lowest)'),
  description: z
    .string()
    .nullable()
    .optional()
    .describe('Updated free-text description (null or empty string to clear)'),
  tags: z.array(z.string()).optional().describe('Updated tags (replaces existing)'),
});

const dependencyInputSchema = z.object({
  dependencyType: z.enum(['API_CALL', 'DB_LINK', 'SHARED_INFRA', 'OTHER']).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  evidenceSnippet: z.string().optional(),
  sourceUrl: z.string().optional(),
});

// Zod's .optional() fields are typed `T | undefined`, and `undefined` isn't a valid
// JsonValue — so a parsed input object can't be assigned into a JsonObject directly.
// These normalize each shape into a plain JsonObject, omitting any field the caller
// didn't set rather than writing it through as `undefined`.

function serviceCreateInputToBody(input: z.infer<typeof serviceCreateInputSchema>): JsonObject {
  const body: JsonObject = { name: input.name };
  if (input.serviceType !== undefined) body.serviceType = input.serviceType;
  if (input.protectionLevel !== undefined) body.protectionLevel = input.protectionLevel;
  if (input.description !== undefined) body.description = input.description;
  if (input.tags !== undefined) body.tags = input.tags;
  return body;
}

function serviceUpdateInputToBody(input: z.infer<typeof serviceUpdateInputSchema>): JsonObject {
  const body: JsonObject = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.serviceType !== undefined) body.serviceType = input.serviceType;
  if (input.protectionLevel !== undefined) body.protectionLevel = input.protectionLevel;
  if (input.description !== undefined) body.description = input.description;
  if (input.tags !== undefined) body.tags = input.tags;
  return body;
}

function dependencyInputToBody(input: z.infer<typeof dependencyInputSchema> | undefined): JsonObject {
  const body: JsonObject = {};
  if (!input) return body;
  if (input.dependencyType !== undefined) body.dependencyType = input.dependencyType;
  if (input.confidenceScore !== undefined) body.confidenceScore = input.confidenceScore;
  if (input.evidenceSnippet !== undefined) body.evidenceSnippet = input.evidenceSnippet;
  if (input.sourceUrl !== undefined) body.sourceUrl = input.sourceUrl;
  return body;
}

export function registerSaveCmdbGraphBatch(server: McpServer) {
  server.registerTool(
    'save_cmdb_graph_batch',
    {
      description:
        'Apply a batch of CMDB graph edits (services and dependency edges) atomically — all of it ' +
        'lands or none of it does. Order within the transaction is fixed: services created, then ' +
        'updated, then dependencies upserted, then dependencies deleted, then services deleted. Use ' +
        '`tempId` on a service create to reference a brand-new service as an edge endpoint in the ' +
        "same batch; the result's createdServiceIds maps each tempId to its real id. Unlike the " +
        'single-edge tools, this does NOT record a graph version — publish one explicitly with ' +
        'publish_cmdb_graph_version.',
      inputSchema: z.object({
        services: z
          .object({
            create: z
              .array(
                z.object({
                  tempId: z.string().min(1).describe('Client-generated placeholder id for this new service'),
                  input: serviceCreateInputSchema,
                }),
              )
              .optional(),
            update: z
              .array(
                z.object({
                  serviceId: z.string().uuid(),
                  input: serviceUpdateInputSchema,
                }),
              )
              .optional(),
            delete: z.array(z.string().uuid()).optional().describe('Real service IDs to delete'),
          })
          .optional(),
        dependencies: z
          .object({
            upsert: z
              .array(
                z.object({
                  parentServiceId: z
                    .string()
                    .min(1)
                    .describe('A service UUID, or a tempId from services.create in this same batch'),
                  childServiceId: z
                    .string()
                    .min(1)
                    .describe('A service UUID, or a tempId from services.create in this same batch'),
                  input: dependencyInputSchema.optional(),
                }),
              )
              .optional(),
            delete: z.array(z.number().int().positive()).optional().describe('Dependency edge IDs to delete'),
          })
          .optional(),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = {
          services: {
            create: (input.services?.create ?? []).map((c) => ({
              tempId: c.tempId,
              input: serviceCreateInputToBody(c.input),
            })),
            update: (input.services?.update ?? []).map((u) => ({
              serviceId: u.serviceId,
              input: serviceUpdateInputToBody(u.input),
            })),
            delete: input.services?.delete ?? [],
          },
          dependencies: {
            upsert: (input.dependencies?.upsert ?? []).map((u) => ({
              parentServiceId: u.parentServiceId,
              childServiceId: u.childServiceId,
              input: dependencyInputToBody(u.input),
            })),
            delete: input.dependencies?.delete ?? [],
          },
        };
        const data = await api.saveCmdbGraphBatch(body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error applying CMDB graph batch: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import { optionalNullableEmailArraySchema } from '../coerceArrays';
import { zIncidentStatusPatch } from '../incidentZod';
import type { IncidentStatus, JsonObject } from '../types';

const inputSchema = z.object({
  incidentId: z.string().uuid().describe('Incident UUID'),
  name: z.string().min(1).max(255).optional().describe('Incident title'),
  status: zIncidentStatusPatch.optional().describe(
    'Incident status (same set as Public API PATCH: ongoing, resolved, stalled, cancelled)',
  ),
  summary: z.string().optional().describe('Summary text'),
  timeline: z.string().optional(),
  postmortem: z.string().optional(),
  occurredAt: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .describe('ISO 8601 datetime or null to clear (same validation as create_incident)'),
  detectedAt: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .describe('ISO 8601 datetime or null to clear'),
  responseStartedAt: z.string().datetime().nullable().optional(),
  temporaryResponseCompletedAt: z.string().datetime().nullable().optional(),
  permanentResponseCompletedAt: z.string().datetime().nullable().optional(),
  assigneeEmails: optionalNullableEmailArraySchema.describe(
    'Full commander list as JSON array of emails, or []; MCP may send a comma-separated string — that is accepted too.',
  ),
});

/**
 * Handler argument type for `update_incident`. Zod validates at runtime; we avoid `z.infer<typeof inputSchema>`
 * here because `assigneeEmails` uses `z.preprocess` and breaks TS inference (ShapeOutput / excessive depth).
 */
type UpdateIncidentToolInput = {
  incidentId: string;
  name?: string;
  status?: IncidentStatus;
  summary?: string;
  timeline?: string;
  postmortem?: string;
  occurredAt?: string | null;
  detectedAt?: string | null;
  responseStartedAt?: string | null;
  temporaryResponseCompletedAt?: string | null;
  permanentResponseCompletedAt?: string | null;
  assigneeEmails?: string[] | null;
};

export function registerUpdateIncident(server: McpServer) {
  server.registerTool(
    'update_incident',
    {
      description:
        'Update an incident via Public API (PATCH /v1/incidents/{id}). Send at least one field: name, status, summary, timeline, postmortem; timestamps occurredAt, detectedAt, responseStartedAt, temporaryResponseCompletedAt, permanentResponseCompletedAt (ISO 8601 strings, or null to clear); assigneeEmails (full commander list).',
      inputSchema,
    },
    async (input: UpdateIncidentToolInput) => {
      try {
        const body: JsonObject = {};
        if (input.name !== undefined) body.name = input.name;
        if (input.status !== undefined) body.status = input.status;
        if (input.summary !== undefined) body.summary = input.summary;
        if (input.timeline !== undefined) body.timeline = input.timeline;
        if (input.postmortem !== undefined) body.postmortem = input.postmortem;
        if (input.occurredAt !== undefined) body.occurredAt = input.occurredAt;
        if (input.detectedAt !== undefined) body.detectedAt = input.detectedAt;
        if (input.responseStartedAt !== undefined) body.responseStartedAt = input.responseStartedAt;
        if (input.temporaryResponseCompletedAt !== undefined) {
          body.temporaryResponseCompletedAt = input.temporaryResponseCompletedAt;
        }
        if (input.permanentResponseCompletedAt !== undefined) {
          body.permanentResponseCompletedAt = input.permanentResponseCompletedAt;
        }
        if (input.assigneeEmails !== undefined) body.assigneeEmails = input.assigneeEmails;

        if (Object.keys(body).length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Error: provide at least one field to update.',
              },
            ],
            isError: true,
          };
        }

        const data = await api.updateIncident(input.incidentId, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error updating incident: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

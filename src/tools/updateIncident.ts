import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import { optionalNullableEmailArraySchema } from '../coerceArrays';
import type { JsonObject } from '../types';

const inputSchema = z.object({
  incidentId: z.string().uuid().describe('Incident UUID'),
  name: z.string().min(1).max(255).optional().describe('Incident title'),
  status: z
    .enum(['ongoing', 'resolved', 'stalled', 'cancelled'])
    .optional()
    .describe('Incident status'),
  summary: z.string().optional().describe('Summary text'),
  timeline: z.string().optional(),
  postmortem: z.string().optional(),
  occurredAt: z.string().nullable().optional().describe('ISO 8601 or null to clear'),
  detectedAt: z.string().nullable().optional(),
  responseStartedAt: z.string().nullable().optional(),
  temporaryResponseCompletedAt: z.string().nullable().optional(),
  permanentResponseCompletedAt: z.string().nullable().optional(),
  assigneeEmails: optionalNullableEmailArraySchema.describe(
    'Full commander list as JSON array of emails, or []; MCP may send a comma-separated string — that is accepted too.',
  ),
});

export function registerUpdateIncident(server: McpServer) {
  server.registerTool(
    'update_incident',
    {
      description:
        'Update an incident via Public API (PATCH). Provide at least one field. Matches Swagger: name, status, summary, timeline, postmortem, timeline fields, assigneeEmails.',
      inputSchema,
    },
    async (input) => {
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

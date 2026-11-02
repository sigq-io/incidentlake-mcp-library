import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { optionalNonEmptyStringArraySchema, optionalNullableEmailArraySchema } from '../coerceArrays';
import { zIncidentStatusCreate, zOptionalNullableIncidentCategory } from '../incidentZod';
import type { IncidentCategory, IncidentCreateStatus, JsonObject } from '../types';

type CreateIncidentInput = {
  name: string;
  summary?: string;
  status?: IncidentCreateStatus;
  severity?: number;
  severityReason?: string | null;
  category?: IncidentCategory | null;
  occurredAt?: string;
  detectedAt?: string;
  responseStartedAt?: string;
  temporaryResponseCompletedAt?: string;
  permanentResponseCompletedAt?: string;
  assigneeEmails?: string[] | null;
  tags?: string[];
  rbacTagIds?: string[];
};

const inputSchema = z.object({
  name: z.string().min(1).max(255).describe('Incident name (required, max 255 characters)'),
  summary: z.string().max(5000).optional().describe('Optional initial summary of the incident'),
  status: zIncidentStatusCreate.optional().describe(
    'Initial status (ongoing, resolved, stalled, cancelled, or false_positive; default ongoing)',
  ),
  severity: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe('Severity level where 1=critical/highest and 5=lowest'),
  severityReason: z
    .string()
    .nullable()
    .optional()
    .describe('Reason for the severity. Requires severity; rejected when severity is omitted.'),
  category: zOptionalNullableIncidentCategory,
  occurredAt: z
    .string()
    .datetime()
    .optional()
    .describe('ISO 8601 timestamp when the incident occurred'),
  detectedAt: z
    .string()
    .datetime()
    .optional()
    .describe('ISO 8601 timestamp when the incident was detected'),
  responseStartedAt: z.string().datetime().optional(),
  temporaryResponseCompletedAt: z.string().datetime().optional(),
  permanentResponseCompletedAt: z.string().datetime().optional(),
  assigneeEmails: optionalNullableEmailArraySchema.describe(
    'Active member emails as JSON array, or comma-separated string.',
  ),
  tags: optionalNonEmptyStringArraySchema.describe(
    'Categorization tags (e.g. client:acme, urgency:high); array or comma-separated string.',
  ),
  rbacTagIds: z
    .array(z.string().uuid())
    .optional()
    .describe(
      'RBAC tag UUIDs to assign on creation. Call list_rbac_tags first to get valid IDs.',
    ),
});

export function registerCreateIncident(server: McpServer) {
  server.registerTool(
    'create_incident',
    {
      description:
        'Create a new incident in Incident Lake. Use this when a user reports a new outage, degradation, or operational issue and wants it tracked in the system.',
      inputSchema: z.object(inputSchema.shape),
    },
    async (input: CreateIncidentInput) => {
      try {
        const body: JsonObject = { name: input.name };
        if (input.summary) body.summary = input.summary;
        if (input.status) body.status = input.status;
        if (input.severity) body.severity = input.severity;
        if (input.severityReason !== undefined) {
          if (input.severity === undefined) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Error: severityReason requires severity.',
                },
              ],
              isError: true,
            };
          }
          body.severityReason = input.severityReason;
        }
        if (input.category !== undefined) body.category = input.category;
        if (input.occurredAt) body.occurredAt = input.occurredAt;
        if (input.detectedAt) body.detectedAt = input.detectedAt;
        if (input.responseStartedAt) body.responseStartedAt = input.responseStartedAt;
        if (input.temporaryResponseCompletedAt) {
          body.temporaryResponseCompletedAt = input.temporaryResponseCompletedAt;
        }
        if (input.permanentResponseCompletedAt) {
          body.permanentResponseCompletedAt = input.permanentResponseCompletedAt;
        }
        if (input.assigneeEmails !== undefined) body.assigneeEmails = input.assigneeEmails;
        if (input.tags?.length) body.tags = input.tags;
        if (input.rbacTagIds?.length) body.rbacTagIds = input.rbacTagIds;

        const data = await api.createIncident(body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error creating incident: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

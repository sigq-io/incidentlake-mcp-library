import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

type CreateIncidentInput = {
  name: string;
  summary?: string;
  status?: 'ongoing' | 'resolved';
  severity?: number;
  occurredAt?: string;
  detectedAt?: string;
  responseStartedAt?: string;
  temporaryResponseCompletedAt?: string;
  permanentResponseCompletedAt?: string;
  assigneeEmails?: string[] | null;
  tags?: string[];
};

const inputSchema = z.object({
  name: z.string().min(1).max(255).describe('Incident name (required, max 255 characters)'),
  summary: z.string().max(5000).optional().describe('Optional initial summary of the incident'),
  status: z.enum(['ongoing', 'resolved']).optional().describe('Initial status (default: ongoing)'),
  severity: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe('Severity level where 1=critical/highest and 5=lowest'),
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
  assigneeEmails: z.array(z.string().email()).nullable().optional().describe('Active member emails'),
  tags: z
    .array(z.string().min(1))
    .optional()
    .describe('Categorization tags (e.g. client:acme, urgency:high)'),
}) as z.ZodType<CreateIncidentInput>;

export function registerCreateIncident(server: McpServer) {
  server.registerTool(
    'create_incident',
    {
      description:
        'Create a new incident in Incident Lake. Use this when a user reports a new outage, degradation, or operational issue and wants it tracked in the system.',
      inputSchema,
    },
    async (input) => {
      try {
        const body: Record<string, unknown> = { name: input.name };
        if (input.summary) body.summary = input.summary;
        if (input.status) body.status = input.status;
        if (input.severity) body.severity = input.severity;
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

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
      const body: Record<string, unknown> = { name: input.name };
      if (input.summary) body.summary = input.summary;
      if (input.status) body.status = input.status;
      if (input.severity) body.severity = input.severity;
      if (input.occurredAt) body.occurredAt = input.occurredAt;
      if (input.detectedAt) body.detectedAt = input.detectedAt;

      const data = await api.createIncident(body);
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    },
  );
}

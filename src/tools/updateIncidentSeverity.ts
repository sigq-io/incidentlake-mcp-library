import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

export function registerUpdateIncidentSeverity(server: McpServer) {
  server.registerTool(
    'update_incident_severity',
    {
      description:
        'Update the severity level and/or reason on an existing severity record. At least one of severity or reason must be provided.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        severityId: z.string().uuid().describe('The UUID of the severity record to update'),
        severity: z
          .number()
          .int()
          .min(1)
          .max(5)
          .optional()
          .describe('New severity level (1=highest, 5=lowest)'),
        reason: z
          .string()
          .nullable()
          .optional()
          .describe('New reason for the severity level; null clears it'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = {};
        if (input.severity !== undefined) body.severity = input.severity;
        if (input.reason !== undefined) body.reason = input.reason;

        if (Object.keys(body).length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'Error: provide at least one of severity or reason.' }],
            isError: true,
          };
        }

        const data = await api.updateIncidentSeverity(input.incidentId, input.severityId, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error updating incident severity: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

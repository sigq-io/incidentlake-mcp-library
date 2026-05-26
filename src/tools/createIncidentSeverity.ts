import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

export function registerCreateIncidentSeverity(server: McpServer) {
  server.registerTool(
    'create_incident_severity',
    {
      description:
        'Create a new severity record for an incident (draft or published). Severity 1 is highest, 5 is lowest.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        severity: z
          .number()
          .int()
          .min(1)
          .max(5)
          .describe('Severity level (1=highest, 5=lowest)'),
        isDraft: z
          .boolean()
          .optional()
          .describe('If true, saves as draft (not published). Defaults to false (published).'),
        reason: z
          .string()
          .nullable()
          .optional()
          .describe('Optional reason for this severity level'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = { severity: input.severity };
        if (input.isDraft !== undefined) body.isDraft = input.isDraft;
        if (input.reason !== undefined) body.reason = input.reason;

        const data = await api.createIncidentSeverity(input.incidentId, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error creating incident severity: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import type { JsonObject } from '../types';

export function registerCompleteSopStep(server: McpServer) {
  server.registerTool(
    'complete_sop_step',
    {
      description:
        'Mark an SOP checklist step as complete for an incident. Optionally specify a completion timestamp; defaults to server time.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        stepId: z.string().uuid().describe('The UUID of the SOP step to mark complete'),
        completedAt: z
          .string()
          .datetime()
          .optional()
          .describe('ISO 8601 completion timestamp; defaults to current time when omitted'),
      }),
    },
    async (input) => {
      try {
        const body: JsonObject = {};
        if (input.completedAt !== undefined) body.completedAt = input.completedAt;

        const data = await api.completeSopStep(input.incidentId, input.stepId, body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error completing SOP step: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

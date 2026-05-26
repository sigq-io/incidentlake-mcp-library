import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerUncompleteSopStep(server: McpServer) {
  server.registerTool(
    'uncomplete_sop_step',
    {
      description: 'Unmark a completed SOP checklist step for an incident (removes the completion record).',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        stepId: z.string().uuid().describe('The UUID of the SOP step to unmark'),
      }),
    },
    async (input) => {
      try {
        const data = await api.uncompleteSopStep(input.incidentId, input.stepId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error uncompleting SOP step: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

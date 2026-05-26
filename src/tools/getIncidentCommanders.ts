import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerGetIncidentCommanders(server: McpServer) {
  server.registerTool(
    'get_incident_commanders',
    {
      description:
        'Get the currently active incident commanders (assignees) for an incident. Returns the same assignees shape as get_incident.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
      }),
    },
    async (input) => {
      try {
        const data = await api.getIncidentCommanders(input.incidentId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error getting incident commanders: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

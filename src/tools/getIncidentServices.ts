import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerGetIncidentServices(server: McpServer) {
  server.registerTool(
    'get_incident_services',
    {
      description:
        'List the services (status-page services) linked to an incident, ordered by protection level then name.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
      }),
    },
    async (input) => {
      try {
        const data = await api.getIncidentServices(input.incidentId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error getting incident services: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

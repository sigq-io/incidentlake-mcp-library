import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerGetIncidentServices(server: McpServer) {
  server.registerTool(
    'get_incident_services',
    {
      description:
        'List the services (status-page services) linked to an incident, ordered by protection level then name.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
      }),
    },
    async (input) => {
      try {
        const data = await api.getIncidentServices(input.incidentId, { includeDrills: input.includeDrills });
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

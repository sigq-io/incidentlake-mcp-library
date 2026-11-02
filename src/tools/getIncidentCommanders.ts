import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerGetIncidentCommanders(server: McpServer) {
  server.registerTool(
    'get_incident_commanders',
    {
      description:
        'Get the currently active incident commanders (assignees) for an incident. Returns the same assignees shape as get_incident.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
      }),
    },
    async (input) => {
      try {
        const data = await api.getIncidentCommanders(input.incidentId, { includeDrills: input.includeDrills });
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

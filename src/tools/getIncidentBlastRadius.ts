import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerGetIncidentBlastRadius(server: McpServer) {
  server.registerTool(
    'get_incident_blast_radius',
    {
      description:
        'Get the blast radius for an incident: the CMDB services affected and the customer names impacted.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
      }),
    },
    async (input) => {
      try {
        const data = await api.getIncidentBlastRadius(input.incidentId, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error getting blast radius: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

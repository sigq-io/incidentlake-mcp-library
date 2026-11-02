import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerGetIncident(server: McpServer) {
  server.registerTool(
    'get_incident',
    {
      description:
        'Get the full details of a specific incident including its summary, timeline, postmortem, tasks, notes, war rooms, and linked services. Use this when you need deep context about a particular incident.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident to fetch'),
        includeDrills: zIncludeDrills,
      }),
    },
    async (input) => {
      try {
        const data = await api.getIncident(input.incidentId, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error fetching incident: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

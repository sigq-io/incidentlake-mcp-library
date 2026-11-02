import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerListIncidentPhaseCaptures(server: McpServer) {
  server.registerTool(
    'list_incident_phase_captures',
    {
      description:
        'List all recorded response timeline captures for an incident (manual or AI-detected), ordered by capture time.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
      }),
    },
    async (input) => {
      try {
        const data = await api.listIncidentPhaseCaptures(input.incidentId, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error listing incident phase captures: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}

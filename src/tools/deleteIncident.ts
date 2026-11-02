import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerDeleteIncident(server: McpServer) {
  server.registerTool(
    'delete_incident',
    {
      description:
        'Permanently delete an incident (DELETE /v1/incidents/{id}). Same cascades as tenant admin delete.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('Incident UUID'),
        includeDrills: zIncludeDrills,
      }),
    },
    async (input) => {
      try {
        const data = await api.deleteIncident(input.incidentId, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error deleting incident: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

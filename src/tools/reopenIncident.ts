import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerReopenIncident(server: McpServer) {
  server.registerTool(
    'reopen_incident',
    {
      description:
        'Reopen an incident (POST /v1/incidents/{id}/reopen). Sets status to ongoing.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('Incident UUID'),
        includeDrills: zIncludeDrills,
      }),
    },
    async (input) => {
      try {
        const data = await api.reopenIncident(input.incidentId, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error reopening incident: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

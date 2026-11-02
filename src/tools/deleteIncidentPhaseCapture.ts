import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerDeleteIncidentPhaseCapture(server: McpServer) {
  server.registerTool(
    'delete_incident_phase_capture',
    {
      description: 'Delete a response timeline capture from an incident — e.g. to undo a mistaken entry.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        captureId: z.string().uuid().describe('The UUID of the capture to delete'),
      }),
    },
    async (input) => {
      try {
        const data = await api.deleteIncidentPhaseCapture(input.incidentId, input.captureId, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error deleting incident phase capture: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}

import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';
import { zIncludeDrills } from '../incidentZod';

export function registerDeleteIncidentPhaseNode(server: McpServer) {
  server.registerTool(
    'delete_incident_phase_node',
    {
      description:
        'Delete a phase from an incident\'s response timeline. If any capture references the phase it is archived instead of removed, so historical captures keep resolving a label. nodeId must come from get_incident_phase_graph after it returns isCustom true, or from a prior create_incident_phase_node call.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        includeDrills: zIncludeDrills,
        nodeId: z.string().uuid().describe('The phase node UUID to delete'),
      }),
    },
    async (input) => {
      try {
        const data = await api.deleteIncidentPhaseNode(input.incidentId, input.nodeId, { includeDrills: input.includeDrills });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error deleting incident phase node: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}

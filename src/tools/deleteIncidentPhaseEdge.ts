import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerDeleteIncidentPhaseEdge(server: McpServer) {
  server.registerTool(
    'delete_incident_phase_edge',
    {
      description:
        'Unlink two phases on an incident\'s response timeline. edgeId must come from get_incident_phase_graph after it returns isCustom true, or from a prior create_incident_phase_edge call.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        edgeId: z.number().int().describe('The phase edge id to delete (from get_incident_phase_graph or create_incident_phase_edge)'),
      }),
    },
    async (input) => {
      try {
        const data = await api.deleteIncidentPhaseEdge(input.incidentId, String(input.edgeId));
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error deleting incident phase edge: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}

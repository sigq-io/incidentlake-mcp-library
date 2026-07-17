import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerCreateIncidentPhaseEdge(server: McpServer) {
  server.registerTool(
    'create_incident_phase_edge',
    {
      description:
        'Link two phases on an incident\'s response timeline (source → target). If the incident is still using the tenant default timeline, this forks a private copy for the incident first, same as create_incident_phase_node. Both node ids must belong to this same incident\'s (already forked) graph.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        sourceNodeId: z.string().uuid().describe('The phase node UUID the link starts from'),
        targetNodeId: z.string().uuid().describe('The phase node UUID the link points to'),
      }),
    },
    async (input) => {
      try {
        const data = await api.createIncidentPhaseEdge(input.incidentId, {
          sourceNodeId: input.sourceNodeId,
          targetNodeId: input.targetNodeId,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error creating incident phase edge: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}

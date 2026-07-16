import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerGetIncidentPhaseGraph(server: McpServer) {
  server.registerTool(
    'get_incident_phase_graph',
    {
      description:
        'Get the response timeline (phase graph) that applies to an incident: its nodes (response phases) and edges (sequencing), plus whether the incident has its own custom graph or uses the tenant default. Use this to discover valid nodeId values before recording a capture.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
      }),
    },
    async (input) => {
      try {
        const data = await api.getIncidentPhaseGraph(input.incidentId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error getting incident phase graph: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

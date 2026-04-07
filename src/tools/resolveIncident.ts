import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerResolveIncident(server: McpServer) {
  server.registerTool(
    'resolve_incident',
    {
      description:
        'Set an incident status to resolved (POST /v1/incidents/{id}/resolve). Equivalent to PATCH with status resolved.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('Incident UUID'),
      }),
    },
    async (input) => {
      try {
        const data = await api.resolveIncident(input.incidentId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error resolving incident: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

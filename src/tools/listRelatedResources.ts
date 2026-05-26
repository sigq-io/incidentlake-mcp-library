import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerListRelatedResources(server: McpServer) {
  server.registerTool(
    'list_related_resources',
    {
      description:
        'List external resources linked to an incident. Each item has a top-level link id and a nested resource object.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
      }),
    },
    async (input) => {
      try {
        const data = await api.listRelatedResources(input.incidentId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error listing related resources: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

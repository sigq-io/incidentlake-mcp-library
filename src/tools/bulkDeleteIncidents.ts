import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerBulkDeleteIncidents(server: McpServer) {
  server.registerTool(
    'bulk_delete_incidents',
    {
      description:
        'Delete multiple incidents in a single request. Returns lists of deleted and failed IDs. Maximum 100 IDs per call.',
      inputSchema: z.object({
        incidentIds: z
          .array(z.string().uuid())
          .min(1)
          .max(100)
          .describe('Array of incident UUIDs to delete (max 100)'),
      }),
    },
    async (input) => {
      try {
        const data = await api.bulkDeleteIncidents(input.incidentIds);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error bulk deleting incidents: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

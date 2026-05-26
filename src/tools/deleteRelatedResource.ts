import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerDeleteRelatedResource(server: McpServer) {
  server.registerTool(
    'delete_related_resource',
    {
      description:
        'Remove a related-resource link from an incident. Use the top-level link id (from list_related_resources), not the resource id.',
      inputSchema: z.object({
        incidentId: z.string().uuid().describe('The UUID of the incident'),
        resourceId: z
          .string()
          .uuid()
          .describe('The link UUID (top-level id from list_related_resources)'),
      }),
    },
    async (input) => {
      try {
        const data = await api.deleteRelatedResource(input.incidentId, input.resourceId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error deleting related resource: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

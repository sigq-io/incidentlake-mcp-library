import { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { api } from '../client';

export function registerSearchRollbarItems(server: McpServer) {
  server.registerTool(
    'search_rollbar_items',
    {
      description:
        "Search the tenant's connected Rollbar project for items (GET /v1/integrations/rollbar/search). Requires the Rollbar integration to be configured. Pass each hit's counter to add_rollbar_related_resource to link it to an incident.",
      inputSchema: z.object({
        query: z.string().optional().describe('Optional text filter matched against item titles'),
      }),
    },
    async (input) => {
      try {
        const data = await api.searchRollbarItems(input.query);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error searching Rollbar: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}

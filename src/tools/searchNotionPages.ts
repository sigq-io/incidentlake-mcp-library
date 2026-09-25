import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerSearchNotionPages(server: McpServer) {
  server.registerTool(
    'search_notion_pages',
    {
      description:
        "Search Notion pages the tenant's integration token can access (GET /v1/integrations/notion/search). Requires the Notion integration to be configured. Use the returned url with add_related_resource_by_url.",
      inputSchema: z.object({
        query: z.string().optional().describe('Optional search query'),
      }),
    },
    async (input) => {
      try {
        const data = await api.searchNotionPages(input.query);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: `Error searching Notion pages: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

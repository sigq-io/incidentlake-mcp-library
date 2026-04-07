import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerSearchKnowledgeItems(server: McpServer) {
  server.registerTool(
    'search_knowledge_items',
    {
      description: 'Search knowledge by title or content (GET /v1/knowledge/search).',
      inputSchema: z.object({
        query: z.string().min(1).describe('Search string'),
        limit: z.number().int().min(1).max(100).optional().describe('Max results (default 10)'),
      }),
    },
    async (input) => {
      try {
        const data = await api.searchKnowledgeItems(input.query, input.limit);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error searching knowledge: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerListKnowledgeItems(server: McpServer) {
  server.registerTool(
    'list_knowledge_items',
    {
      description: 'List all knowledge items for the tenant (GET /v1/knowledge).',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await api.listKnowledgeItems();
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error listing knowledge items: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}

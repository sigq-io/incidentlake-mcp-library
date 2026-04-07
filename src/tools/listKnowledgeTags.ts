import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerListKnowledgeTags(server: McpServer) {
  server.registerTool(
    'list_knowledge_tags',
    {
      description: 'List knowledge tags with item counts (GET /v1/knowledge/tags).',
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await api.listKnowledgeTags();
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error listing knowledge tags: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}

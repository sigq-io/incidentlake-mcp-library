import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerDeleteKnowledgeItem(server: McpServer) {
  server.registerTool(
    'delete_knowledge_item',
    {
      description: 'Delete a knowledge item (DELETE /v1/knowledge/{knowledgeId}).',
      inputSchema: z.object({
        knowledgeId: z.string().uuid(),
      }),
    },
    async (input) => {
      try {
        const data = await api.deleteKnowledgeItem(input.knowledgeId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error deleting knowledge item: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}

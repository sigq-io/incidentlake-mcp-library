import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';

export function registerGetKnowledgeItem(server: McpServer) {
  server.registerTool(
    'get_knowledge_item',
    {
      description: 'Get one knowledge item by UUID (GET /v1/knowledge/{knowledgeId}).',
      inputSchema: z.object({
        knowledgeId: z.string().uuid(),
      }),
    },
    async (input) => {
      try {
        const data = await api.getKnowledgeItem(input.knowledgeId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error fetching knowledge item: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}

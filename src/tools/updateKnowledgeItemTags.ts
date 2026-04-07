import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { api } from '../client';
import { coercedTagArraySchema } from '../coerceArrays';

export function registerUpdateKnowledgeItemTags(server: McpServer) {
  server.registerTool(
    'update_knowledge_item_tags',
    {
      description:
        'Replace all tags on a knowledge item (PATCH /v1/knowledge/{knowledgeId}/tags).',
      inputSchema: z.object({
        knowledgeId: z.string().uuid(),
        tags: coercedTagArraySchema.describe(
          'Full new tag list; array or comma-separated string.',
        ),
      }),
    },
    async (input) => {
      try {
        const data = await api.updateKnowledgeItemTags(input.knowledgeId, input.tags);
        return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            { type: 'text' as const, text: `Error updating knowledge tags: ${errorMessage}` },
          ],
          isError: true,
        };
      }
    },
  );
}
